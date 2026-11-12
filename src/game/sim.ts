// The match simulation. Pure rules: no drawing, no timers, no floating-point maths.
// Same seed + same commands => exactly the same match on every device.
import { type Pt, Rng, clamp, dist2, hashInts, idiv, isqrt, pct, within } from './math';
import {
  BOSS_PIT, CAMPS, CORES, DENS, FIELD, LANES, LANE_HALF, SHRINES, WARD_SPOTS, type Lane, type LaneId, activeLanes, inJungle,
  laneDist2, nearestS, pointAt, directionAt, towerPos, uToS,
} from './map';
import {
  BOUNTY, CLASSES, CLASS_IDS, FURY, HEROES, HERO_IDS, HERO_RULES, ITEMS, ITEM_IDS, ITEM_SLOTS, MANA, MATCH, NEUTRALS,
  RELICS, SPECIES, SPECIES_IDS, STRUCTURES, TICKS_PER_SECOND, UNITS, VISION, WARDS, WAVES, XP,
  type ClassId, type HeroKind, type ItemDef, type ItemId, type SpeciesId, type Targets, type UnitKind, sec,
} from './rules';
import { KITS } from './heroes';

export type Player = 0 | 1;
export const NEUTRAL = 2;
export type Owner = Player | typeof NEUTRAL;
export type EntKind = 'unit' | 'hero' | 'tower' | 'core' | 'camp' | 'ward' | 'relic';
export type OrderType = 'push' | 'defend' | 'gank' | 'farm' | 'ward' | 'retreat' | 'move' | 'attack';
export type CampKind = 'grove' | 'den' | 'boss';

export interface Order {
  type: OrderType;
  /** Lane for push / gank / defend (the tower's lane). */
  lane: LaneId;
  /** Farm: the camp, den, boss or relic (entity id). */
  camp: number;
  /** Ward: the ward spot index. */
  spot: number;
  /** Move: the spot to go to and hold. */
  x: number; y: number;
  /** Attack: the enemy (entity id) to go after (DEC-017). */
  target: number;
}

export interface Ent {
  id: number;
  kind: EntKind;
  owner: Owner;
  /** Owner before a charm (Dalang's ultimate) took it over. */
  homeOwner: Owner;
  alive: boolean;
  x: number; y: number;
  /** Position at the start of the tick (for smooth drawing only). */
  px: number; py: number;
  r: number;
  hp: number; maxHp: number;
  damage: number; attackTicks: number; atkCd: number; range: number; sight: number; speed: number;
  targets: Targets;
  xpValue: number;
  unit: UnitKind | null;
  hero: HeroKind | null;
  lane: LaneId;
  wp: number;
  targetId: number;
  deploy: number;
  lastHitOwner: number; lastHitId: number; lastHitTick: number;
  // status effects (ticks left; 0 = none)
  stun: number; silence: number; immune: number;
  slow: number; slowPct: number; // speed while slowed, in percent
  haste: number; hastePct: number; // speed bonus, in percent
  atkBuff: number; atkBuffPct: number; // time between hits, in percent (50 = twice as fast)
  dmgBuff: number; dmgBuffPct: number; // extra damage, in percent
  shield: number; shieldTicks: number;
  dot: number; dotPct: number; dotFlat: number; dotOwner: number; // damage over time (per second values)
  regen: number; regenPct: number; // heal over time (percent of max health per second)
  mark: number; markBy: number; // takes +50% damage from player markBy
  charm: number;
  duelWith: number; duel: number;
  life: number; // summons expire when this runs out (0 = permanent)
  flying: boolean;
  lowPriority: boolean; // enemies hit other targets first
  splash: number; // ticks of splash hits (Gergasi's Rampage)
  // heroes
  level: number; heroXp: number; respawn: number; powerCd: number; ultReady: boolean;
  ambushLeft: number; hidden: boolean; grace: number; veil: number; gankBonus: number;
  bonusPct: number; blockCd: number; transformed: boolean;
  order: Order; prevOrder: Order;
  goalX: number; goalY: number;
  // camps, wards, relics
  camp: number;
  campKind: CampKind;
  respawnTotal: number;
  spot: number; // ward spot
  relic: number; // relic reward: 0 Semangat, 1 XP, 2 boost
  // troops
  wave: boolean; // came with a lane wave
  spawnCd: number; // Ratu Sarang's hatching timer
  usedFirst: boolean; // charge / leap / bomb already used
  // heroes
  fury: number; // Jungle Fury ticks left
  streak: number; // hero kills in a row
  items: ItemId[]; // bought items (DEC-011)
  ultArmed: boolean; // the player has called the ultimate; it fires at the next good moment
  ultUntil: number; // tick when the ultimate's lasting effect ends (for drawing)
  fallback: boolean; // badly hurt while pushing: heading home to heal (DEC-017)
  waiting: boolean; // holding outside an enemy tower until own troops arrive (for the screen)
}

/** Everything a player can do (DEC-011): choose lane troops, order heroes, buy items, call ultimates. */
export type Command =
  | { t: 'wave'; player: Player; lane: LaneId; card: ClassId }
  /** camp: index into Sim.camps() (groves, dens, boss); target: an entity id (relics); spot: ward spot; x, y: move. */
  | { t: 'order'; player: Player; hero: HeroKind; order: OrderType; lane?: LaneId; camp?: number; target?: number; spot?: number; x?: number; y?: number }
  | { t: 'buy'; player: Player; hero: HeroKind; item: ItemId }
  /** Call (or cancel) a hero's ultimate. */
  | { t: 'ult'; player: Player; hero: HeroKind };

export type GameEvent =
  | { k: 'hit'; x1: number; y1: number; x2: number; y2: number; ranged: boolean; owner: Owner }
  | { k: 'boom'; x: number; y: number; r: number; owner: Owner }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; owner: Owner }
  | { k: 'text'; x: number; y: number; text: string; tone: 'mana' | 'xp' | 'ambush' | 'level' | 'info' | 'ult' }
  | { k: 'death'; x: number; y: number; owner: Owner; big: boolean }
  /** An ultimate fired (DEC-013): where, how big, and a second point for lines (see each kit). */
  | { k: 'ult'; hero: HeroKind; owner: Owner; x: number; y: number; r: number; x2?: number; y2?: number };

export type ZoneKind = 'lantern' | 'fog' | 'flood' | 'tide';

export interface Zone {
  id: number;
  kind: ZoneKind;
  owner: Player;
  x: number; y: number; r: number;
  lane: LaneId;
  until: number;
  heal: boolean;
}

export interface PlayerState {
  species: SpeciesId;
  /** The class each lane's waves are made of (index = lane id). */
  laneClass: ClassId[];
  mana: number; // points; MANA.perMana points = 1 Semangat
  picks: HeroKind[];
  towersDestroyed: number; // enemy towers this player has destroyed
  heroIds: Partial<Record<HeroKind, number>>;
  manaSlow: number; // Senja's ultimate: refill halved
  halfPrice: boolean; // Saudagar's ultimate: the next item costs half
}

export interface Result {
  winner: Player | null;
  reason: 'core' | 'towers' | 'sudden' | 'draw';
}

export interface SimOptions {
  seed: number;
  lanes?: 2 | 3;
  /** Minion waves (on by default; tests can turn them off). */
  waves?: boolean;
  /** Each player's two heroes. Default: Rimba and Benteng for both. */
  picks?: [HeroKind[], HeroKind[]];
  /** Each player's species. Default: Kampung for both. */
  species?: [SpeciesId, SpeciesId];
}

export interface FoeQuery {
  heroesOnly?: boolean;
  unitsOnly?: boolean; // troops and summons, no heroes
  structures?: boolean; // include towers and the Core
  hidden?: boolean; // include hidden heroes
}

const NO_ORDER: Order = { type: 'push', lane: 0, camp: 0, spot: 0, x: 0, y: 0, target: 0 };
export const DEFAULT_PICKS: HeroKind[] = ['rimba', 'benteng', 'kail'];

/** Draft turn order (DEC-015): player 0, then the bot twice, player 0 twice, the bot (a snake). */
export const DRAFT_ORDER: readonly Player[] = [0, 1, 1, 0, 0, 1];

/** A species picked at random from a seed (used for the bot and for tests). */
export function randomSpecies(seed: number): SpeciesId {
  return SPECIES_IDS[new Rng((seed ^ 0x6b43a9b5) >>> 0).int(SPECIES_IDS.length)];
}

/** Different heroes picked at random from a seed, avoiding `exclude` (used for the bot and tests). */
export function randomPicks(seed: number, exclude: readonly HeroKind[] = [], n: number = HERO_RULES.heroesPerPlayer): HeroKind[] {
  const rng = new Rng((seed ^ 0x2545f491) >>> 0);
  const out: HeroKind[] = [];
  while (out.length < n) {
    const free = HERO_IDS.filter((k) => !out.includes(k) && !exclude.includes(k));
    if (!free.length) break;
    out.push(free[rng.int(free.length)]);
  }
  return out;
}

/**
 * The bot's next draft pick (DEC-015): seeded, never a taken hero, and it prefers a best order its
 * line-up doesn't have yet, so its three heroes do different jobs. Same inputs => same pick.
 */
export function botDraftPick(seed: number, taken: readonly HeroKind[], own: readonly HeroKind[]): HeroKind {
  const rng = new Rng((seed ^ 0x51ed270b ^ (taken.length * 0x9e3779b9)) >>> 0);
  const free = HERO_IDS.filter((k) => !taken.includes(k));
  const fresh = free.filter((k) => !own.some((o) => HEROES[o].best === HEROES[k].best));
  const pool = fresh.length ? fresh : free;
  return pool[rng.int(pool.length)];
}

export class Sim {
  readonly seed: number;
  readonly laneCount: 2 | 3;
  readonly lanes: LaneId[];
  readonly waves: boolean;
  tick = 0;
  ents: Ent[] = [];
  zones: Zone[] = [];
  players: [PlayerState, PlayerState];
  result: Result | null = null;
  /** Events from the last step, for drawing only (not part of the rules). */
  events: GameEvent[] = [];
  private nextId = 1;
  private rng: Rng;
  private queue: Command[] = [];
  private relicCount = 0;
  private firstKill = false;

  constructor(opts: SimOptions) {
    this.seed = opts.seed >>> 0;
    this.laneCount = opts.lanes ?? 3;
    this.lanes = activeLanes(this.laneCount);
    this.waves = opts.waves ?? true;
    this.rng = new Rng(this.seed);
    const picks = opts.picks ?? [DEFAULT_PICKS, DEFAULT_PICKS];
    const species = opts.species ?? ['kampung', 'kampung'];
    // No hero on both sides (DEC-014): a repeat on the second side becomes the first free hero.
    const mine = validPicks(picks[0]);
    const theirs = validPicks(picks[1]).map((k) => k);
    theirs.forEach((k, i) => {
      if (mine.includes(k)) theirs[i] = HERO_IDS.find((f) => !mine.includes(f) && !theirs.includes(f)) as HeroKind;
    });
    this.players = [this.newPlayer(mine, species[0]), this.newPlayer(theirs, species[1])];
    for (const p of [0, 1] as const) {
      for (const id of this.lanes) {
        const lane = LANES[id];
        const [x, y] = towerPos(lane, p);
        const t = this.spawn('tower', p, x, y, STRUCTURES.tower.radius);
        this.structure(t, STRUCTURES.tower);
        t.lane = id;
      }
      const c = this.spawn('core', p, CORES[p][0], CORES[p][1], STRUCTURES.core.radius);
      this.structure(c, STRUCTURES.core);
    }
    // Neutral objectives (DEC-009). Order matters: camps() index 0-1 groves, 2-3 dens, 4 boss.
    const neutral = (kind: CampKind, pt: Pt, i: number) => {
      const n = NEUTRALS[kind];
      const c = this.spawn('camp', NEUTRAL, pt[0], pt[1], n.radius);
      Object.assign(c, { hp: n.hp, maxHp: n.hp, damage: n.damage, attackTicks: n.attackTicks, range: n.range, camp: i, campKind: kind });
      return c;
    };
    CAMPS.forEach((pt, i) => neutral('grove', pt, i));
    DENS.forEach((pt, i) => neutral('den', pt, 2 + i));
    const boss = neutral('boss', BOSS_PIT, 4);
    boss.alive = false;
    boss.respawn = NEUTRALS.boss.first;
    boss.respawnTotal = NEUTRALS.boss.first;
    // The heroes start at the Pusaka (DEC-011, DEC-014): one heading for each lane, in order
    // (left, middle, right; in 2-lane mode the third joins the left lane).
    for (const p of [0, 1] as const) {
      this.players[p].picks.forEach((kind, i) => {
        const lane = this.lanes[i % this.lanes.length];
        const [x, y] = [CORES[p][0] + (i - 1) * 220, CORES[p][1] + (p === 0 ? -420 : 420)];
        const h = this.spawnHero(p, kind, x, y, lane);
        h.deploy = HERO_RULES.startDelay;
        if (HEROES[kind].best === 'defend') h.order = { ...NO_ORDER, type: 'defend', lane };
        else this.setPathFrom(h, lane, nearestS(LANES[lane], x, y));
      });
    }
  }

  // ---------- public helpers ----------

  /** Queue a command; it takes effect on the next step if it is still valid then. */
  submit(cmd: Command): void {
    this.queue.push(cmd);
  }

  phase(): 'regulation' | 'sudden' | 'over' {
    if (this.result) return 'over';
    return this.tick < MATCH.regulation ? 'regulation' : 'sudden';
  }

  /** Ticks left in the current phase. */
  timeLeft(): number {
    if (this.tick < MATCH.regulation) return MATCH.regulation - this.tick;
    return Math.max(0, MATCH.regulation + MATCH.suddenDeath - this.tick);
  }

  doubleMana(): boolean {
    return this.tick >= MATCH.doubleManaFrom;
  }

  manaOf(p: Player): number {
    return this.players[p].mana;
  }

  /** What an item costs this player right now, in Semangat (Saudagar's ultimate halves the next one). */
  itemCost(p: Player, item: ItemId): number {
    const base = ITEMS[item].cost;
    return this.players[p].halfPrice ? Math.max(1, idiv(base, 2)) : base;
  }

  /** Why an item can't be bought for a hero right now, or null if it can. */
  cantBuy(p: Player, kind: HeroKind, item: ItemId): 'no hero' | 'owned' | 'full' | 'semangat' | null {
    const h = this.heroOf(p, kind);
    if (!h) return 'no hero';
    if (h.items.includes(item)) return 'owned';
    if (h.items.length >= ITEM_SLOTS) return 'full';
    if (this.players[p].mana < this.itemCost(p, item) * MANA.perMana) return 'semangat';
    return null;
  }

  /** Sum (or product, for percent multipliers) of an item stat on a hero. */
  itemStat(h: Ent, key: keyof Pick<ItemDef, 'damagePct' | 'hpPct' | 'speedPct' | 'regenPct' | 'trueSight'>): number {
    let n = 0;
    for (const id of h.items) n += ITEMS[id][key] ?? 0;
    return n;
  }

  itemMul(h: Ent, key: keyof Pick<ItemDef, 'cooldownPct' | 'attackPct' | 'armorPct' | 'sightPct'>, v: number): number {
    for (const id of h.items) { const m = ITEMS[id][key]; if (m !== undefined) v = pct(v, m); }
    return v;
  }

  /** Can this hero be ordered to attack t (DEC-017)? An enemy its side can see and it is able to hit. */
  canAttack(h: Ent, t: Ent): boolean {
    return this.targetable(h, t) && this.sees(h.homeOwner as Player, t);
  }

  /** Is now a good moment for this hero's ultimate? Lights the ULT button (DEC-011). */
  ultSuggested(h: Ent): boolean {
    if (!this.canUlt(h)) return false;
    const kit = KITS[h.hero as HeroKind];
    if (kit.ult) return kit.ult(this, h, false);
    return true; // moment ultimates (ambush, gank, escape): call them ahead of time
  }

  get(id: number): Ent | undefined {
    for (const e of this.ents) if (e.id === id) return e;
    return undefined;
  }

  heroOf(p: Player, kind: HeroKind): Ent | undefined {
    const id = this.players[p].heroIds[kind];
    return id === undefined ? undefined : this.get(id);
  }

  heroes(p: Player): Ent[] {
    return this.ents.filter((e) => e.kind === 'hero' && e.homeOwner === p);
  }

  towerOf(p: Player, lane: LaneId): Ent | undefined {
    return this.ents.find((e) => e.kind === 'tower' && e.owner === p && e.lane === lane);
  }

  coreOf(p: Player): Ent {
    const c = this.ents.find((e) => e.kind === 'core' && e.owner === p);
    if (!c) throw new Error('core missing');
    return c;
  }

  /** Groves (0-1), dens (2-3) and the boss (4), alive or not. */
  camps(): Ent[] {
    return this.ents.filter((e) => e.kind === 'camp');
  }

  relics(): Ent[] {
    return this.ents.filter((e) => e.kind === 'relic' && e.alive);
  }

  wards(p?: Player): Ent[] {
    return this.ents.filter((e) => e.kind === 'ward' && e.alive && (p === undefined || e.owner === p));
  }

  /** The lane an entity is in (or nearest to). */
  laneOf(e: Ent): LaneId {
    if (e.kind === 'unit') return e.lane;
    let best = this.lanes[0];
    let bestD = Infinity;
    for (const id of this.lanes) {
      const d = laneDist2(LANES[id], e.x, e.y);
      if (d < bestD) { bestD = d; best = id; }
    }
    return best;
  }

  /** The lane a hero is in (or nearest to), used to tell a push from a gank. */
  heroLane(h: Ent): LaneId {
    if (!h.alive) return h.order.lane;
    return this.laneOf(h);
  }

  /** Distance along a lane from player p's own end. */
  uOf(laneId: LaneId, p: Player, x: number, y: number): number {
    const s = nearestS(LANES[laneId], x, y);
    return p === 0 ? s : LANES[laneId].length - s;
  }

  /** How far an entity sees through the fog of war (DEC-012). */
  visionOf(e: Ent): number {
    switch (e.kind) {
      case 'hero': return this.itemMul(e, 'sightPct', VISION.hero);
      case 'unit': return e.unit === 'watchtower' ? VISION.watchtower : VISION.unit;
      case 'tower': return VISION.tower;
      case 'core': return VISION.core;
      case 'ward': return VISION.ward;
      default: return 0;
    }
  }

  /**
   * Can player p see entity e (DEC-012)? Your own pieces, towers, the Pusaka, camps and relics are
   * always seen. Anything else must be within the vision of one of your pieces (or Seri's lanterns),
   * and heroes hidden in the jungle stay unseen unless revealed.
   */
  sees(p: Player, e: Ent): boolean {
    if (e.owner === p || e.kind === 'tower' || e.kind === 'core' || e.kind === 'camp' || e.kind === 'relic') return true;
    if (e.kind === 'hero' && e.hidden) return false;
    for (const v of this.ents) {
      if (!v.alive || v.owner !== p) continue;
      const r = this.visionOf(v);
      if (r > 0 && within(v.x, v.y, e.x, e.y, r)) return true;
    }
    for (const z of this.zones) if (z.kind === 'lantern' && z.owner === p && within(z.x, z.y, e.x, e.y, z.r)) return true;
    return false;
  }

  hash(): number {
    const v: number[] = [this.tick, this.rng.state(), this.nextId, this.result ? 1 + (this.result.winner ?? 2) : 0];
    for (const pl of this.players) {
      v.push(pl.mana, pl.towersDestroyed, pl.manaSlow, pl.halfPrice ? 1 : 0, SPECIES_IDS.indexOf(pl.species),
        ...pl.laneClass.map((c) => CLASS_IDS.indexOf(c)));
    }
    for (const z of this.zones) v.push(z.id, z.x, z.y, z.r, z.until);
    for (const e of this.ents) {
      v.push(e.id, e.owner, e.alive ? 1 : 0, e.x, e.y, e.hp, e.maxHp, e.atkCd, e.targetId, e.wp, e.deploy, e.slow, e.stun,
        e.silence, e.shield, e.dot, e.charm, e.duel, e.life, e.level, e.heroXp, e.respawn, e.powerCd, e.ultReady ? 1 : 0,
        e.ambushLeft, e.hidden ? 1 : 0, e.order.lane, e.camp, e.bonusPct, e.fury, e.spawnCd, e.streak, e.order.spot,
        e.order.x, e.order.y, e.order.target, e.ultArmed ? 1 : 0, e.fallback ? 1 : 0, ...e.items.map((i) => ITEM_IDS.indexOf(i)));
    }
    return hashInts(v);
  }

  // ---------- effect helpers used by hero kits ----------

  /** Enemies of player p near (x, y), nearest first. Powers can hit fliers; hidden heroes are skipped. */
  foes(p: Owner, x: number, y: number, r: number, q: FoeQuery = {}): Ent[] {
    const out: { e: Ent; d: number }[] = [];
    for (const t of this.ents) {
      if (!t.alive || t.hp <= 0 || t.owner === p || t.owner === NEUTRAL) continue;
      const structure = t.kind === 'tower' || t.kind === 'core';
      if (structure && !q.structures) continue;
      if (t.kind === 'camp') continue;
      if (q.heroesOnly && t.kind !== 'hero') continue;
      if (q.unitsOnly && t.kind !== 'unit') continue;
      if (t.kind === 'hero' && t.hidden && !q.hidden) continue;
      const d = dist2(x, y, t.x, t.y);
      const rr = r + t.r;
      if (d <= rr * rr) out.push({ e: t, d });
    }
    out.sort((a, b) => a.d - b.d || a.e.id - b.e.id);
    return out.map((o) => o.e);
  }

  /** Friendly troops and heroes of player p near (x, y). */
  allies(p: Owner, x: number, y: number, r: number, heroes = true): Ent[] {
    return this.ents.filter((t) => t.alive && t.hp > 0 && t.owner === p && (t.kind === 'unit' || (heroes && t.kind === 'hero')) && within(x, y, t.x, t.y, r + t.r));
  }

  /** Damage from a hero power. Returns the damage dealt. */
  hurt(t: Ent, amount: number, src: Ent | null, spell = true): number {
    return this.damage(t, amount, src, { spell });
  }

  heal(t: Ent, amount: number): void {
    if (!t.alive || t.hp <= 0) return;
    t.hp = Math.min(t.maxHp, t.hp + amount);
  }

  stunFor(t: Ent, ticks: number): void {
    if (t.immune > 0 || t.kind === 'tower' || t.kind === 'core' || t.kind === 'camp') return;
    t.stun = Math.max(t.stun, ticks);
  }

  silenceFor(t: Ent, ticks: number): void {
    if (t.immune > 0) return;
    t.silence = Math.max(t.silence, ticks);
  }

  /** Slow to `speedPct` percent of normal speed. */
  slowFor(t: Ent, speedPct: number, ticks: number): void {
    if (t.immune > 0 || t.kind === 'tower' || t.kind === 'core') return;
    if (t.slow <= 0 || speedPct < t.slowPct) t.slowPct = speedPct;
    t.slow = Math.max(t.slow, ticks);
  }

  hasteFor(t: Ent, bonusPct: number, ticks: number): void {
    if (t.haste <= 0 || bonusPct > t.hastePct) t.hastePct = bonusPct;
    t.haste = Math.max(t.haste, ticks);
  }

  dmgBuffFor(t: Ent, bonusPct: number, ticks: number): void {
    if (t.dmgBuff <= 0 || bonusPct > t.dmgBuffPct) t.dmgBuffPct = bonusPct;
    t.dmgBuff = Math.max(t.dmgBuff, ticks);
  }

  /** Attack interval at `intervalPct` percent (50 = twice as fast). */
  atkBuffFor(t: Ent, intervalPct: number, ticks: number): void {
    if (t.atkBuff <= 0 || intervalPct < t.atkBuffPct) t.atkBuffPct = intervalPct;
    t.atkBuff = Math.max(t.atkBuff, ticks);
  }

  shieldFor(t: Ent, amount: number, ticks: number): void {
    t.shield = Math.max(t.shield, amount);
    t.shieldTicks = Math.max(t.shieldTicks, ticks);
  }

  /** Damage over time: `pctPerSec` of max health plus `flatPerSec`, for `ticks`. */
  dotFor(t: Ent, pctPerSec: number, flatPerSec: number, ticks: number, owner: number): void {
    if (t.kind === 'tower' || t.kind === 'core' || t.kind === 'camp') return;
    if (t.dot <= 0 || pctPerSec >= t.dotPct) t.dotPct = pctPerSec;
    if (t.dot <= 0 || flatPerSec >= t.dotFlat) t.dotFlat = flatPerSec;
    t.dot = Math.max(t.dot, ticks);
    t.dotOwner = owner;
  }

  regenFor(t: Ent, pctPerSec: number, ticks: number): void {
    t.regenPct = pctPerSec;
    t.regen = Math.max(t.regen, ticks);
  }

  markFor(t: Ent, by: Player, ticks: number): void {
    t.mark = Math.max(t.mark, ticks);
    t.markBy = by;
  }

  /** Move an entity instantly (dash, pull, teleport) and keep it on its lane path. */
  place(e: Ent, x: number, y: number): void {
    e.x = clamp(Math.trunc(x), FIELD.minX, FIELD.maxX);
    e.y = clamp(Math.trunc(y), FIELD.minY, FIELD.maxY);
    if (e.kind === 'unit' || (e.kind === 'hero' && e.order.type === 'push')) {
      const lane = e.kind === 'unit' ? e.lane : e.order.lane;
      this.setPathFrom(e, lane, nearestS(LANES[lane], e.x, e.y));
    }
  }

  /** A point `gap` short of target t, on the line from e. */
  beside(e: Ent, t: Ent, gap = 20): Pt {
    const dx = e.x - t.x;
    const dy = e.y - t.y;
    const d = Math.max(1, isqrt(dx * dx + dy * dy));
    const off = e.r + t.r + gap;
    return [t.x + idiv(dx * off, d), t.y + idiv(dy * off, d)];
  }

  /** Push away from (fx, fy) by dist. */
  knockback(t: Ent, dist: number, fx: number, fy: number): void {
    if (t.immune > 0 || t.kind === 'tower' || t.kind === 'core' || t.kind === 'camp') return;
    let dx = t.x - fx;
    let dy = t.y - fy;
    let d = isqrt(dx * dx + dy * dy);
    if (d === 0) { dx = 0; dy = t.owner === 0 ? 1 : -1; d = 1; }
    this.place(t, t.x + idiv(dx * dist, d), t.y + idiv(dy * dist, d));
  }

  /** Push back along its lane towards its own side. */
  pushBack(t: Ent, dist: number): void {
    if (t.immune > 0 || (t.kind !== 'unit' && t.kind !== 'hero')) return;
    const laneId = this.laneOf(t);
    const lane = LANES[laneId];
    const s = nearestS(lane, t.x, t.y);
    const s2 = clamp(t.owner === 0 ? s - dist : s + dist, 0, lane.length);
    const [x, y] = pointAt(lane, s2);
    this.place(t, x, y);
  }

  summon(owner: Player, kind: UnitKind, x: number, y: number, laneId: LaneId, opts: { life?: number; hpPct?: number; dmgPct?: number } = {}): Ent {
    const lane = LANES[laneId];
    const e = this.spawnUnit(owner, kind, x, y, laneId, nearestS(lane, x, y));
    if (opts.life) e.life = opts.life;
    if (opts.hpPct) { e.maxHp = Math.max(1, pct(e.maxHp, opts.hpPct)); e.hp = e.maxHp; }
    if (opts.dmgPct) e.damage = pct(e.damage, opts.dmgPct);
    e.xpValue = kind === 'decoy' ? 0 : Math.min(e.xpValue, 6);
    return e;
  }

  addZone(z: Omit<Zone, 'id'>): Zone {
    const zone = { ...z, id: this.nextId++ };
    this.zones.push(zone);
    return zone;
  }

  charmFor(t: Ent, by: Player, ticks: number): void {
    if (t.kind !== 'unit' || t.immune > 0) return;
    t.owner = by;
    t.charm = ticks;
    t.targetId = 0;
    this.setPathFrom(t, t.lane, nearestS(LANES[t.lane], t.x, t.y));
  }

  startDuel(a: Ent, b: Ent, ticks: number): void {
    a.duelWith = b.id;
    b.duelWith = a.id;
    a.duel = ticks;
    b.duel = ticks;
    a.targetId = b.id;
    b.targetId = a.id;
  }

  say(x: number, y: number, text: string, tone: Extract<GameEvent, { k: 'text' }>['tone'] = 'info'): void {
    this.events.push({ k: 'text', x, y, text, tone });
  }

  fx(ev: GameEvent): void {
    this.events.push(ev);
  }

  /** An ultimate's on-screen effect (DEC-013). x2, y2: a second point (line ultimates). */
  ultFx(h: Ent, x: number, y: number, r: number, x2?: number, y2?: number): void {
    this.events.push({ k: 'ult', hero: h.hero as HeroKind, owner: h.homeOwner, x, y, r, x2, y2 });
  }

  /** Power rank 1-3 from the hero's level. */
  rank(h: Ent): 1 | 2 | 3 {
    return Math.min(3, h.level) as 1 | 2 | 3;
  }

  /** A base amount scaled by the hero's level (+15% a level). */
  scaled(h: Ent, base: number): number {
    return pct(base, 100 + XP.perLevelPercent * (h.level - 1));
  }

  // ---------- the step ----------

  step(): void {
    this.events = [];
    if (this.result) return;
    for (const e of this.ents) { e.px = e.x; e.py = e.y; }
    const cmds = this.queue;
    this.queue = [];
    for (const c of cmds) this.apply(c);

    this.regenMana();
    // PLAN-011: every living hero gains a little XP each second, so ultimates come in every match.
    if (this.tick > 0 && this.tick % TICKS_PER_SECOND === 0) for (const h of this.ents) if (h.kind === 'hero' && h.alive) this.giveXp(h, XP.trickle);

    if (this.waves && this.tick >= WAVES.first && (this.tick - WAVES.first) % WAVES.every === 0) this.spawnWaves();

    if (this.tick >= RELICS.first && (this.tick - RELICS.first) % RELICS.every === 0) this.spawnRelics();
    this.updateZones();

    for (const e of this.ents) {
      this.tickStatus(e);
      switch (e.kind) {
        case 'unit': this.updateUnit(e); break;
        case 'hero': this.updateHero(e); break;
        case 'tower': case 'core': this.updateStructure(e); break;
        case 'camp': this.updateCamp(e); break;
      }
    }
    this.separate();
    this.pickUpRelics();
    this.updateHidden();
    this.resolveDeaths();
    this.ents = this.ents.filter((e) => e.alive || (e.kind !== 'unit' && e.kind !== 'ward' && e.kind !== 'relic'));

    this.tick++;
    if (!this.result) {
      if (this.tick === MATCH.regulation) {
        const [a, b] = [this.players[0].towersDestroyed, this.players[1].towersDestroyed];
        if (a !== b) this.result = { winner: a > b ? 0 : 1, reason: 'towers' };
      } else if (this.tick >= MATCH.regulation + MATCH.suddenDeath) {
        this.result = { winner: null, reason: 'draw' };
      }
    }
  }

  private regenMana(): void {
    const base = this.doubleMana() ? MANA.doubleRegenPerTick : MANA.regenPerTick;
    this.players.forEach((pl, p) => {
      let regen: number = base;
      if (pl.manaSlow > 0) { pl.manaSlow--; if (this.tick % 2 === 1) regen = 0; }
      // Saudagar's Trade Route: +10% refill while he lives.
      if (this.tick % 10 === 0 && this.heroes(p as Player).some((h) => h.alive && h.hero === 'saudagar')) regen += base;
      pl.mana = Math.min(MANA.max, pl.mana + regen);
    });
  }

  // ---------- commands ----------

  private apply(c: Command): boolean {
    if (this.result) return false;
    const pl = this.players[c.player];
    switch (c.t) {
      case 'order': return this.applyOrder(c);
      case 'wave':
        if (!SPECIES[pl.species].classes.includes(c.card) || c.lane < 0 || c.lane > 2) return false;
        pl.laneClass[c.lane] = c.card;
        return true;
      case 'buy': {
        if (!ITEMS[c.item] || this.cantBuy(c.player, c.hero, c.item)) return false;
        const h = this.heroOf(c.player, c.hero) as Ent;
        pl.mana -= this.itemCost(c.player, c.item) * MANA.perMana;
        pl.halfPrice = false;
        h.items.push(c.item);
        this.refreshHero(h);
        this.say(h.x, h.y - 150, ITEMS[c.item].name, 'level');
        return true;
      }
      case 'ult': {
        const h = this.heroOf(c.player, c.hero);
        if (!h || !h.ultReady) return false;
        h.ultArmed = !h.ultArmed;
        return true;
      }
    }
  }

  private applyOrder(c: Extract<Command, { t: 'order' }>): boolean {
    const h = this.heroOf(c.player, c.hero);
    if (!h) return false;
    const lane = c.lane ?? h.order.lane;
    let order: Order;
    switch (c.order) {
      case 'push': case 'gank': case 'defend':
        if (!this.lanes.includes(lane)) return false;
        order = { ...NO_ORDER, type: c.order, lane };
        break;
      case 'move':
        if (c.x === undefined || c.y === undefined) return false;
        order = { ...NO_ORDER, type: 'move', lane: h.order.lane, x: clamp(Math.trunc(c.x), FIELD.minX, FIELD.maxX), y: clamp(Math.trunc(c.y), FIELD.minY, FIELD.maxY) };
        break;
      case 'farm': {
        const target = c.target !== undefined ? this.get(c.target) : this.camps()[c.camp ?? 0];
        if (!target || (target.kind !== 'camp' && target.kind !== 'relic')) return false;
        order = { ...NO_ORDER, type: 'farm', lane: h.order.lane, camp: target.id };
        break;
      }
      case 'ward': {
        const spot = c.spot ?? 0;
        if (spot < 0 || spot >= WARD_SPOTS.length) return false;
        order = { ...NO_ORDER, type: 'ward', lane: h.order.lane, spot };
        break;
      }
      case 'retreat':
        order = { ...NO_ORDER, type: 'retreat', lane: h.order.lane };
        break;
      case 'attack': {
        // Only an enemy you can see and this hero can hit; a neutral camp means Farm.
        const t = c.target !== undefined ? this.get(c.target) : undefined;
        if (!t || !t.alive || t.hp <= 0) return false;
        if (t.kind === 'camp') { order = { ...NO_ORDER, type: 'farm', lane: h.order.lane, camp: t.id }; break; }
        if (!this.canAttack(h, t)) return false;
        order = { ...NO_ORDER, type: 'attack', lane: h.order.lane, target: t.id };
        break;
      }
    }
    if (order.type === 'gank' && h.alive && this.heroLane(h) === order.lane) order.type = 'push';
    // Farm, ward and attack are errands: afterwards the hero goes back to what it was doing.
    const errand = (t: OrderType) => t === 'farm' || t === 'ward' || t === 'attack';
    if (errand(order.type)) h.prevOrder = errand(h.order.type) ? h.prevOrder : h.order;
    h.fallback = false;
    h.order = order;
    h.targetId = 0;
    if (h.alive && order.type === 'push') this.setPathFrom(h, order.lane, nearestS(LANES[order.lane], h.x, h.y));
    if (order.type === 'gank') {
      this.updateGankGoal(h);
      if (h.alive) this.onGankStart(h);
    }
    return true;
  }

  /** Gank order hooks: Seri's Veil (any of her team) and Layang's Moon Kite (herself). */
  private onGankStart(h: Ent): void {
    for (const ally of this.heroes(h.homeOwner as Player)) {
      const kit = KITS[ally.hero as HeroKind];
      if (kit.onTeamGank && this.canUlt(ally) && ally.ultArmed) {
        if (kit.onTeamGank(this, ally, h)) this.ultFired(ally);
      }
    }
  }

  // ---------- spawning ----------

  private newPlayer(picks: HeroKind[], species: SpeciesId): PlayerState {
    const sp = SPECIES[species] ? species : 'kampung';
    const classes = SPECIES[sp].classes;
    return {
      species: sp, laneClass: [classes[0], classes[1 % classes.length], classes[2 % classes.length]],
      mana: MANA.start, picks, towersDestroyed: 0, heroIds: {}, manaSlow: 0, halfPrice: false,
    };
  }

  private spawn(kind: EntKind, owner: Owner, x: number, y: number, r: number): Ent {
    const e: Ent = {
      id: this.nextId++, kind, owner, homeOwner: owner, alive: true, x, y, px: x, py: y, r,
      hp: 1, maxHp: 1, damage: 0, attackTicks: sec(1), atkCd: 0, range: 0, sight: 0, speed: 0, targets: 'any', xpValue: 0,
      unit: null, hero: null, lane: 0, wp: 0, targetId: 0, deploy: 0,
      lastHitOwner: -1, lastHitId: 0, lastHitTick: 0,
      stun: 0, silence: 0, immune: 0, slow: 0, slowPct: 100, haste: 0, hastePct: 0, atkBuff: 0, atkBuffPct: 100,
      dmgBuff: 0, dmgBuffPct: 0, shield: 0, shieldTicks: 0, dot: 0, dotPct: 0, dotFlat: 0, dotOwner: -1,
      regen: 0, regenPct: 0, mark: 0, markBy: -1, charm: 0, duelWith: 0, duel: 0, life: 0,
      flying: false, lowPriority: false, splash: 0,
      level: 1, heroXp: 0, respawn: 0, powerCd: 0, ultReady: false,
      ambushLeft: 0, hidden: false, grace: 0, veil: 0, gankBonus: 0, bonusPct: 0, blockCd: 0, transformed: false,
      order: NO_ORDER, prevOrder: NO_ORDER, goalX: x, goalY: y, camp: 0, campKind: 'grove', respawnTotal: 0, spot: 0, relic: 0,
      wave: false, spawnCd: 0, usedFirst: false, fury: 0, streak: 0, items: [], ultArmed: false, ultUntil: 0, fallback: false, waiting: false,
    };
    this.ents.push(e);
    return e;
  }

  private structure(e: Ent, s: { hp: number; damage: number; attackTicks: number; range: number }): void {
    Object.assign(e, { hp: s.hp, maxHp: s.hp, damage: s.damage, attackTicks: s.attackTicks, range: s.range, sight: s.range });
  }

  private spawnUnit(owner: Player, kind: UnitKind, x: number, y: number, laneId: LaneId, s: number): Ent {
    const st = UNITS[kind];
    const e = this.spawn('unit', owner, x, y, st.radius);
    Object.assign(e, {
      unit: kind, hp: st.hp, maxHp: st.hp, damage: st.damage, attackTicks: st.attackTicks, atkCd: idiv(st.attackTicks, 2),
      range: st.range, sight: st.sight, speed: st.speed, targets: st.targets, xpValue: st.xp, flying: !!st.flying,
      spawnCd: st.spawn ? st.spawn.every : 0,
    });
    this.setPathFrom(e, laneId, s);
    return e;
  }

  private spawnHero(owner: Player, kind: HeroKind, x: number, y: number, laneId: LaneId): Ent {
    const st = HEROES[kind];
    const h = this.spawn('hero', owner, x, y, st.radius);
    Object.assign(h, {
      hero: kind, range: st.range, sight: st.sight, speed: st.speed, targets: st.targets, xpValue: st.xp,
      flying: st.flying, powerCd: idiv(st.powerTicks, 2),
      order: { ...NO_ORDER, lane: laneId } satisfies Order,
    });
    this.refreshHero(h);
    h.hp = h.maxHp;
    KITS[kind].onSpawn?.(this, h);
    this.players[owner].heroIds[kind] = h.id;
    return h;
  }

  /** Recompute a hero's health, damage and attack speed from level and form. */
  private refreshHero(h: Ent): void {
    const st = HEROES[h.hero as HeroKind];
    const scale = 100 + XP.perLevelPercent * (h.level - 1);
    const oldMax = h.maxHp;
    h.maxHp = pct(pct(pct(st.hp, scale), h.transformed ? 140 : 100), 100 + this.itemStat(h, 'hpPct'));
    h.damage = pct(st.damage, scale);
    h.attackTicks = h.transformed ? pct(st.attackTicks, 77) : st.attackTicks;
    if (oldMax > 1 && h.alive) h.hp = Math.min(h.maxHp, h.hp + (h.maxHp - oldMax));
  }

  /** Each lane sends a wave of the class its player chose for it (DEC-008); waves grow each minute. */
  private spawnWaves(): void {
    const strength = 100 + WAVES.growPctPerMinute * idiv(this.tick, sec(60));
    for (const id of this.lanes) {
      const lane = LANES[id];
      for (const p of [0, 1] as const) {
        const cls = CLASSES[this.players[p].laneClass[id]];
        const kind = cls.unit;
        const count = cls.wave;
        const s = uToS(lane, p, WAVES.spawnU);
        const [cx, cy] = pointAt(lane, s);
        const [dx, dy] = directionAt(lane, s);
        const len = Math.max(1, isqrt(dx * dx + dy * dy));
        for (let i = 0; i < count; i++) {
          const side = count === 1 ? 0 : -110 + idiv(220 * i, count - 1);
          const e = this.spawnUnit(p, kind, cx + idiv(-dy * side, len), cy + idiv(dx * side, len), id, s);
          e.maxHp = Math.max(1, pct(e.maxHp, strength));
          e.hp = e.maxHp;
          e.damage = pct(e.damage, strength);
          e.wave = true;
          e.xpValue = idiv(WAVES.waveXp, count);
        }
      }
    }
  }

  /** Point the entity at the next waypoint ahead of distance s on a lane. */
  private setPathFrom(e: Ent, laneId: LaneId, s: number): void {
    const lane = LANES[laneId];
    e.lane = laneId;
    if (e.owner === 0) {
      let i = 0;
      while (i < lane.cum.length - 1 && lane.cum[i] <= s) i++;
      e.wp = i;
    } else {
      let i = lane.cum.length - 1;
      while (i > 0 && lane.cum[i] >= s) i--;
      e.wp = i;
    }
  }

  // ---------- statuses and zones ----------

  private tickStatus(e: Ent): void {
    if (!e.alive) return;
    if (e.stun > 0) e.stun--;
    if (e.silence > 0) e.silence--;
    if (e.immune > 0) e.immune--;
    if (e.haste > 0) e.haste--;
    if (e.atkBuff > 0) e.atkBuff--;
    if (e.dmgBuff > 0) e.dmgBuff--;
    if (e.mark > 0) e.mark--;
    if (e.splash > 0) e.splash--;
    if (e.veil > 0) e.veil--;
    if (e.gankBonus > 0) e.gankBonus--;
    if (e.blockCd > 0) e.blockCd--;
    if (e.shieldTicks > 0 && --e.shieldTicks === 0) e.shield = 0;
    if (e.dot > 0) {
      e.dot--;
      if (e.dot % 10 === 0 && e.hp > 0) {
        const perHalfSec = idiv(pct(e.maxHp, e.dotPct) + e.dotFlat, 2);
        this.damage(e, Math.max(1, perHalfSec), null, { pure: true, owner: e.dotOwner });
      }
    }
    if (e.regen > 0) {
      e.regen--;
      if (e.regen % 20 === 0) this.heal(e, pct(e.maxHp, e.regenPct));
    }
    if (e.duel > 0 && --e.duel === 0) this.endDuel(e);
    if (e.charm > 0 && --e.charm === 0) {
      e.owner = e.homeOwner;
      e.targetId = 0;
      this.setPathFrom(e, e.lane, nearestS(LANES[e.lane], e.x, e.y));
    }
    if (e.life > 0 && --e.life === 0) e.hp = 0;
  }

  private endDuel(e: Ent): void {
    const other = e.duelWith ? this.get(e.duelWith) : undefined;
    e.duelWith = 0;
    e.duel = 0;
    if (other && other.duelWith === e.id) { other.duelWith = 0; other.duel = 0; }
  }

  private inLaneZone(z: Zone, e: Ent): boolean {
    return laneDist2(LANES[z.lane], e.x, e.y) <= (LANE_HALF + 100) * (LANE_HALF + 100);
  }

  private updateZones(): void {
    this.zones = this.zones.filter((z) => z.until > this.tick);
    for (const z of this.zones) {
      for (const e of this.ents) {
        if (!e.alive || e.hp <= 0 || (e.kind !== 'unit' && e.kind !== 'hero')) continue;
        const enemy = e.owner !== z.owner && e.owner !== NEUTRAL;
        switch (z.kind) {
          case 'fog':
            if (enemy && within(z.x, z.y, e.x, e.y, z.r)) this.slowFor(e, 60, 2);
            break;
          case 'flood':
            if (!this.inLaneZone(z, e)) break;
            if (enemy) this.slowFor(e, 50, 2);
            else if (e.owner === z.owner && e.kind === 'unit') this.hasteFor(e, 30, 2);
            break;
          case 'tide':
            if (e.owner === z.owner && e.kind === 'unit' && this.inLaneZone(z, e)) { this.hasteFor(e, 30, 2); this.dmgBuffFor(e, 30, 2); }
            break;
          case 'lantern':
            if (z.heal && e.owner === z.owner && this.tick % 20 === 0 && within(z.x, z.y, e.x, e.y, 600)) this.heal(e, pct(e.maxHp, 2));
            break;
        }
      }
    }
  }

  // ---------- updates ----------

  private speedOf(e: Ent): number {
    let s = e.speed;
    if (e.slow > 0) { e.slow--; s = pct(s, e.slowPct); }
    if (e.haste > 0) s = pct(s, 100 + e.hastePct);
    if (e.fury > 0) s = pct(s, 100 + FURY.speedPct);
    if (e.kind === 'hero') {
      const kit = KITS[e.hero as HeroKind];
      if (kit.speedPct) s = pct(s, kit.speedPct(this, e));
      s = pct(s, 100 + this.itemStat(e, 'speedPct'));
    }
    return s;
  }

  private moveTo(e: Ent, x: number, y: number, spd: number): boolean {
    const dx = x - e.x;
    const dy = y - e.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= spd * spd) { e.x = x; e.y = y; return true; }
    const d = isqrt(d2);
    e.x += idiv(dx * spd, d);
    e.y += idiv(dy * spd, d);
    return false;
  }

  private followPath(e: Ent, spd: number): void {
    const lane = LANES[e.lane];
    if (e.wp < 0 || e.wp >= lane.pts.length) return;
    // A waypoint counts as reached within this radius, so units walking side by side
    // (and pushing each other apart) don't get stuck circling the exact point.
    const ARRIVE = 120;
    let [x, y] = lane.pts[e.wp];
    if (within(e.x, e.y, x, y, ARRIVE)) {
      const nextWp = e.wp + (e.owner === 0 ? 1 : -1);
      if (nextWp >= 0 && nextWp < lane.pts.length) {
        e.wp = nextWp;
        [x, y] = lane.pts[e.wp];
      }
    }
    this.moveTo(e, x, y, spd);
  }

  private isEnemy(a: Ent, b: Ent): boolean {
    return b.owner !== a.owner && b.owner !== NEUTRAL && a.owner !== NEUTRAL;
  }

  private canHitAir(by: Ent): boolean {
    return by.kind === 'tower' || by.kind === 'core' || by.range >= 300 || by.flying;
  }

  private targetable(by: Ent, t: Ent): boolean {
    if (!t.alive || t.hp <= 0 || !this.isEnemy(by, t)) return false;
    if (t.kind === 'hero' && t.hidden) return false;
    if (t.kind === 'camp' || t.kind === 'relic') return false;
    if (t.kind === 'ward' && by.kind !== 'hero') return false; // only heroes clear wards
    if (by.targets === 'buildings' && t.kind !== 'tower' && t.kind !== 'core') return false;
    if (t.flying && !this.canHitAir(by)) return false;
    if (t.duelWith && by.id !== t.duelWith) return false;
    if (by.duelWith && t.id !== by.duelWith) return false;
    return true;
  }

  /** Nearest enemy within `reach` of (cx, cy). Low-priority targets (Pelanduk) only if nothing else. */
  private acquire(e: Ent, reach: number, cx = e.x, cy = e.y, filter?: (t: Ent) => boolean): Ent | null {
    let best: Ent | null = null;
    let bestD = Infinity;
    let low: Ent | null = null;
    let lowD = Infinity;
    for (const t of this.ents) {
      if (!this.targetable(e, t) || (filter && !filter(t))) continue;
      const d = dist2(cx, cy, t.x, t.y);
      const r = reach + t.r;
      if (d > r * r) continue;
      if (t.lowPriority) { if (d < lowD) { low = t; lowD = d; } } else if (d < bestD) { best = t; bestD = d; }
    }
    return best ?? low;
  }

  private inRange(e: Ent, t: Ent): boolean {
    return within(e.x, e.y, t.x, t.y, e.range + e.r + t.r);
  }

  private currentTarget(e: Ent, keepWithin: number): Ent | null {
    if (!e.targetId) return null;
    const t = this.get(e.targetId);
    if (!t || !this.targetable(e, t) || !within(e.x, e.y, t.x, t.y, keepWithin + t.r)) { e.targetId = 0; return null; }
    return t;
  }

  private attackInterval(e: Ent): number {
    let ticks = e.attackTicks;
    if (e.atkBuff > 0) ticks = pct(ticks, e.atkBuffPct);
    if (e.kind === 'hero') ticks = this.itemMul(e, 'attackPct', ticks);
    if (e.kind === 'tower' || e.kind === 'core') {
      // Benteng's Hold the Gate: a tower near him attacks 20% faster.
      for (const h of this.ents) {
        if (h.kind === 'hero' && h.hero === 'benteng' && h.alive && h.owner === e.owner && within(h.x, h.y, e.x, e.y, 900)) { ticks = pct(ticks, 80); break; }
      }
    }
    return Math.max(4, ticks);
  }

  /** A basic attack. Applies best-order bonus, Ambush and the attacker's on-hit effects. */
  private attack(e: Ent, t: Ent): void {
    let dmg = e.damage;
    const kit = e.kind === 'hero' ? KITS[e.hero as HeroKind] : undefined;
    if (e.kind === 'hero') {
      const def = HEROES[e.hero as HeroKind];
      let bonus = e.bonusPct + (e.dmgBuff > 0 ? e.dmgBuffPct : 0) + (e.fury > 0 ? FURY.damagePct : 0) + this.itemStat(e, 'damagePct');
      if (def.best === e.order.type || (def.best === 'gank' && e.gankBonus > 0)) bonus += HERO_RULES.bestOrderPercent;
      dmg = pct(dmg, 100 + bonus);
      if (kit?.attackPct) dmg = pct(dmg, kit.attackPct(this, e, t));
    } else if (e.dmgBuff > 0) {
      dmg = pct(dmg, 100 + e.dmgBuffPct);
    }
    let ambush = false;
    if (e.kind === 'hero' && e.ambushLeft > 0) {
      dmg = pct(dmg, HERO_RULES.ambushPercent);
      e.ambushLeft = 0;
      ambush = true;
      this.say(t.x, t.y - 120, 'Ambush!', 'ambush');
    }
    const st = e.kind === 'unit' && e.unit ? UNITS[e.unit] : undefined;
    if (st?.bomb) {
      // Kerikil: burst on contact, then it's gone.
      const r = 160;
      for (const o of this.ents) {
        if (!o.alive || o.hp <= 0 || !this.isEnemy(e, o) || o.kind === 'ward' || o.kind === 'relic' || !within(t.x, t.y, o.x, o.y, r + o.r)) continue;
        this.damage(o, o.kind === 'tower' || o.kind === 'core' ? st.bomb : idiv(st.bomb, 2), e, {});
      }
      this.events.push({ k: 'boom', x: t.x, y: t.y, r, owner: e.owner });
      e.hp = 0;
      return;
    }
    let first = false;
    if (st && (st.charge) && !e.usedFirst) { e.usedFirst = true; first = true; }
    const dealt = this.damage(t, dmg, e, {});
    e.atkCd = this.attackInterval(e);
    this.events.push({ k: 'hit', x1: e.x, y1: e.y, x2: t.x, y2: t.y, ranged: e.range > 300, owner: e.owner });
    if (st) {
      if (first) { this.knockback(t, 200, e.x, e.y); this.stunFor(t, sec(0.5)); }
      if (st.slowOnHit) this.slowFor(t, st.slowOnHit, sec(1));
      if (st.poisonOnHit) this.dotFor(t, st.poisonOnHit, 0, sec(2), e.owner);
      if (st.splash) {
        for (const o of this.ents) {
          if (o.id === t.id || !o.alive || o.hp <= 0 || !this.isEnemy(e, o) || o.kind === 'ward' || o.kind === 'relic' || (o.kind === 'hero' && o.hidden)) continue;
          if (within(t.x, t.y, o.x, o.y, st.splash + o.r)) this.damage(o, dmg, e, {});
        }
      }
      if (st.chain) {
        let best: Ent | null = null;
        let bestD = Infinity;
        for (const o of this.ents) {
          if (o.id === t.id || !this.targetable(e, o) || o.kind === 'tower' || o.kind === 'core') continue;
          const d = dist2(t.x, t.y, o.x, o.y);
          if (d <= 220 * 220 && d < bestD) { best = o; bestD = d; }
        }
        if (best) {
          this.damage(best, pct(dmg, st.chain), e, {});
          this.events.push({ k: 'line', x1: t.x, y1: t.y, x2: best.x, y2: best.y, owner: e.owner });
        }
      }
    }
    if (kit?.onHit) kit.onHit(this, e, t, dealt);
    if (ambush && kit?.onAmbush && this.canUlt(e) && e.ultArmed && kit.onAmbush(this, e, t)) this.ultFired(e);
  }

  /** Attack a target in range, or close in on it. */
  private engage(e: Ent, t: Ent, spd: number): void {
    if (this.inRange(e, t)) {
      // Kerikil has no normal hit: its attack is the burst.
      if (e.atkCd <= 0 && (e.damage > 0 || (e.unit && UNITS[e.unit].bomb))) this.attack(e, t);
    } else if (spd > 0) {
      this.moveTo(e, t.x, t.y, spd);
    }
  }

  private updateUnit(e: Ent): void {
    if (!e.alive || e.hp <= 0) return;
    if (e.deploy > 0) { e.deploy--; return; }
    if (e.stun > 0) return;
    if (e.atkCd > 0) e.atkCd--;
    const spd = this.speedOf(e);
    if (e.sight <= 0) { this.followPath(e, spd); return; } // decoys just walk
    const st = e.unit ? UNITS[e.unit] : undefined;
    if (st?.spawn && --e.spawnCd <= 0) {
      // Ratu Sarang hatches ants beside her.
      e.spawnCd = st.spawn.every;
      for (let i = 0; i < st.spawn.count; i++) {
        const a = this.summon(e.owner as Player, st.spawn.kind, e.x + (i ? 70 : -70), e.y, e.lane, { life: st.spawn.life });
        a.xpValue = 2;
      }
    }
    let t = this.currentTarget(e, e.sight + 200);
    if (!t || (this.tick + e.id) % 4 === 0) {
      const n = this.acquire(e, e.sight);
      if (n) { t = n; e.targetId = n.id; }
    }
    if (t && st?.leap && !e.usedFirst && !this.inRange(e, t) && within(e.x, e.y, t.x, t.y, st.leap + t.r)) {
      // Harimau Bintang leaps onto its first target.
      e.usedFirst = true;
      const [x, y] = this.beside(e, t);
      this.events.push({ k: 'line', x1: e.x, y1: e.y, x2: x, y2: y, owner: e.owner });
      this.place(e, x, y);
    }
    if (t) this.engage(e, t, spd);
    else if (spd > 0) this.followPath(e, spd);
  }

  /**
   * The enemy tower (or Pusaka) that would shoot this hero at (x, y) with nothing else to shoot, or
   * undefined. A hero may go in when its own troops are inside the tower's reach to take the shots,
   * when the tower is nearly down, or (Gergasi, the tower-breaker) while it's healthy (DEC-017).
   */
  private towerForbids(h: Ent, x: number, y: number): Ent | undefined {
    const p = h.homeOwner as Player;
    for (const s of this.ents) {
      if ((s.kind !== 'tower' && s.kind !== 'core') || !s.alive || s.owner === p) continue;
      const reach = s.range + s.r + h.r;
      if (!within(x, y, s.x, s.y, reach)) continue;
      if (s.hp * 4 < s.maxHp) continue;
      if (h.targets === 'buildings' && h.hp * 2 > h.maxHp) continue;
      let cover = false;
      for (const u of this.ents) {
        if (u.kind === 'unit' && u.alive && u.hp > 0 && u.owner === p && within(u.x, u.y, s.x, s.y, s.range + s.r + u.r)) { cover = true; break; }
      }
      if (!cover) return s;
    }
    return undefined;
  }

  private moveAway(e: Ent, from: Ent, spd: number): void {
    const dx = e.x - from.x;
    const dy = e.y - from.y;
    const d = Math.max(1, isqrt(dx * dx + dy * dy));
    this.moveTo(e, e.x + idiv(dx * 200, d), e.y + idiv(dy * 200, d), spd);
  }

  /**
   * A pushing hero's pick (DEC-017): an enemy hero it can already reach (the weakest), else the
   * weakest enemy in reach, else the nearest in sight; never one under a tower it shouldn't enter.
   */
  private heroTarget(h: Ent): Ent | null {
    let best: Ent | null = null;
    let bestScore = -Infinity;
    for (const t of this.ents) {
      if (!this.targetable(h, t)) continue;
      const reach = h.sight + t.r;
      const d2 = dist2(h.x, h.y, t.x, t.y);
      if (d2 > reach * reach || this.towerForbids(h, t.x, t.y)) continue;
      const inReach = this.inRange(h, t);
      let score = -isqrt(d2); // nearer is better
      if (inReach) score += 10_000 - idiv(t.hp * 1000, Math.max(1, t.maxHp)); // weaker is better
      if (inReach && t.kind === 'hero') score += 20_000;
      if (t.lowPriority) score -= 40_000;
      if (score > bestScore || (score === bestScore && best && t.id < best.id)) { best = t; bestScore = score; }
    }
    return best;
  }

  private retreatPoint(p: Player): Pt {
    return [CORES[p][0], CORES[p][1] + (p === 0 ? -420 : 420)];
  }

  private anchorFor(h: Ent): Pt {
    const p = h.homeOwner as Player;
    const toRiver = p === 0 ? -1 : 1;
    if (h.order.type === 'defend') {
      const [x, y] = towerPos(LANES[h.order.lane], p);
      return [x, y + 250 * toRiver];
    }
    if (h.order.type === 'move') return [h.order.x, h.order.y];
    return [CORES[p][0], CORES[p][1] + 420 * toRiver];
  }

  private canUlt(h: Ent): boolean {
    return h.alive && h.hp > 0 && h.ultReady && h.silence <= 0 && h.stun <= 0 && h.deploy <= 0;
  }

  private ultFired(h: Ent): void {
    h.ultReady = false;
    h.ultArmed = false;
    h.ultUntil = this.tick + (KITS[h.hero as HeroKind].ultLasts ?? 0);
    this.say(h.x, h.y - 170, HEROES[h.hero as HeroKind].ult.name, 'ult');
  }

  private updateHero(h: Ent): void {
    const p = h.homeOwner as Player;
    if (!h.alive) {
      if (h.respawn > 0) h.respawn--;
      if (h.respawn <= 0) this.respawnHero(h);
      return;
    }
    if (h.deploy > 0) { h.deploy--; return; }
    if (h.hp <= 0 || h.stun > 0) return;
    if (h.atkCd > 0) h.atkCd--;
    if (h.powerCd > 0) h.powerCd--;
    const def = HEROES[h.hero as HeroKind];
    const kit = KITS[h.hero as HeroKind];
    kit.tick?.(this, h);
    if (this.tick % 20 === 0) {
      const regen = this.itemStat(h, 'regenPct');
      if (regen > 0) this.heal(h, pct(h.maxHp, regen));
    }
    const spd = this.speedOf(h);
    const o = h.order;

    if (o.type === 'gank') {
      if (this.tick % 10 === 0) this.updateGankGoal(h);
      // Arrive at the goal, or as soon as the hero reaches the lane with an enemy in attack range.
      const atLane = laneDist2(LANES[o.lane], h.x, h.y) <= (LANE_HALF + 250) * (LANE_HALF + 250);
      const strike = atLane && this.acquire(h, h.range) !== null;
      if (strike || this.moveTo(h, h.goalX, h.goalY, spd) || within(h.x, h.y, h.goalX, h.goalY, HERO_RULES.gankArrive)) {
        h.order = { ...NO_ORDER, lane: o.lane };
        h.gankBonus = HERO_RULES.gankBonusTicks;
        this.setPathFrom(h, o.lane, nearestS(LANES[o.lane], h.x, h.y));
      }
      return;
    }

    // Powers fire by themselves (DEC-007); the ultimate fires once called, at a good moment (DEC-011).
    // Silence stops both.
    if (h.silence <= 0) {
      if (h.ultArmed && this.canUlt(h) && kit.ult && kit.ult(this, h, true)) this.ultFired(h);
      if (h.powerCd <= 0 && kit.power(this, h, this.rank(h))) {
        h.powerCd = this.itemMul(h, 'cooldownPct', def.powerTicks);
        this.say(h.x, h.y - 140, def.power.name, 'info');
      }
    }
    if (!h.alive || h.hp <= 0 || h.stun > 0) return;

    // A duel overrides orders: fight the duel partner.
    if (h.duelWith) {
      const t = this.get(h.duelWith);
      if (t && t.alive && t.hp > 0) { this.engage(h, t, spd); return; }
    }

    if (o.type === 'ward') {
      const [wx, wy] = WARD_SPOTS[o.spot];
      // Clear an enemy ward on the spot first, then plant our own.
      const enemyWard = this.ents.find((w) => w.kind === 'ward' && w.alive && w.owner !== p && within(w.x, w.y, wx, wy, 150));
      if (enemyWard) { this.engage(h, enemyWard, spd); return; }
      if (this.moveTo(h, wx, wy, spd) || within(h.x, h.y, wx, wy, 120)) {
        this.placeWard(h, o.spot);
        this.endFarm(h);
      }
      return;
    }

    if (o.type === 'farm') {
      const camp = this.get(o.camp);
      if (!camp || !camp.alive) { this.endFarm(h); return; }
      if (camp.kind === 'relic') { this.moveTo(h, camp.x, camp.y, spd); return; } // picked up on touch
      if (within(h.x, h.y, camp.x, camp.y, h.range + h.r + camp.r)) {
        if (h.atkCd <= 0 && h.damage > 0 && h.targets === 'any') {
          this.damage(camp, h.damage, h, {});
          h.atkCd = this.attackInterval(h);
          this.events.push({ k: 'hit', x1: h.x, y1: h.y, x2: camp.x, y2: camp.y, ranged: h.range > 300, owner: p });
        } else if (h.targets !== 'any') {
          this.endFarm(h); // Gergasi can't fight camps
        }
      } else {
        this.moveTo(h, camp.x, camp.y, spd);
      }
      return;
    }

    if (o.type === 'attack') {
      // Go after the chosen enemy while it can be seen, then back to the previous job (DEC-017).
      const t = this.get(o.target);
      if (!t || !t.alive || t.hp <= 0 || !this.sees(p, t) || !this.targetable(h, t)) { this.endFarm(h); return; }
      h.targetId = t.id;
      this.engage(h, t, spd);
      return;
    }

    h.waiting = false;
    if (o.type === 'push') {
      // Badly hurt: head home to heal, then come back (DEC-017).
      if (h.hp * 100 < h.maxHp * HERO_RULES.fallbackBelowPct) h.fallback = true;
      else if (h.hp * 100 >= h.maxHp * HERO_RULES.fallbackUntilPct) h.fallback = false;
    }
    if (o.type === 'push' && !h.fallback) {
      let t = this.currentTarget(h, h.sight + 200);
      if (t && this.towerForbids(h, t.x, t.y)) { t = null; h.targetId = 0; }
      if (!t || (this.tick + h.id) % 4 === 0) {
        const n = this.heroTarget(h);
        if (n) { t = n; h.targetId = n.id; }
      }
      if (t) {
        this.engage(h, t, spd);
        return;
      }
      // Already standing where an enemy tower would shoot us alone: step back out of its reach.
      const shooter = this.towerForbids(h, h.x, h.y);
      if (shooter) {
        this.moveAway(h, shooter, spd);
        h.waiting = true;
        return;
      }
      const limit = kit.pushLimit?.(this, h);
      if (limit === undefined || this.uOf(h.lane, p, h.x, h.y) < limit) {
        const [ox, oy] = [h.x, h.y];
        this.followPath(h, spd);
        // Don't walk into an enemy tower's reach until our own troops are there to take its shots.
        if (this.towerForbids(h, h.x, h.y)) { h.x = ox; h.y = oy; h.waiting = true; }
      }
      return;
    }

    // defend / retreat / move (and falling back): hold a point, fight what comes close, don't chase far.
    const home = o.type === 'retreat' || h.fallback;
    const [ax, ay] = h.fallback ? this.retreatPoint(p) : this.anchorFor(h);
    const leash = o.type === 'defend' ? HERO_RULES.defendLeash : o.type === 'move' ? HERO_RULES.moveLeash : 700;
    let t = this.currentTarget(h, h.sight + 200);
    if (t && !within(ax, ay, t.x, t.y, leash)) { t = null; h.targetId = 0; }
    if (!t) {
      const n = this.acquire(h, h.sight, h.x, h.y, (c) => within(ax, ay, c.x, c.y, leash));
      if (n) { t = n; h.targetId = n.id; }
    }
    if (t && !(h.fallback && !this.inRange(h, t))) this.engage(h, t, spd); // falling back: hit only what's in reach
    else this.moveTo(h, ax, ay, spd);
    if (home && this.tick % 20 === 0) {
      const core = CORES[p];
      if (within(h.x, h.y, core[0], core[1], HERO_RULES.retreatHealRadius)) {
        h.hp = Math.min(h.maxHp, h.hp + pct(h.maxHp, HERO_RULES.retreatHealPerSecondPercent));
      }
    }
  }

  private placeWard(h: Ent, spot: number): void {
    const p = h.homeOwner as Player;
    const [x, y] = WARD_SPOTS[spot];
    for (const w of this.ents) if (w.kind === 'ward' && w.alive && w.owner === p && w.spot === spot) { w.alive = false; w.hp = 0; }
    const mine = this.wards(p).sort((a, b) => a.id - b.id);
    while (mine.length >= WARDS.max) { const old = mine.shift() as Ent; old.alive = false; old.hp = 0; }
    const w = this.spawn('ward', p, x, y, 50);
    Object.assign(w, { hp: WARDS.hits, maxHp: WARDS.hits, life: WARDS.life, spot });
    this.giveXp(h, WARDS.placeXp);
    this.say(x, y - 100, 'Ward placed', 'info');
  }

  private spawnRelics(): void {
    const n = this.relicCount++;
    const pair = n % 2; // alternate between the two shrine pairs
    for (const i of [pair, pair + 2]) {
      const [x, y] = SHRINES[i];
      const r = this.spawn('relic', NEUTRAL, x, y, 60);
      Object.assign(r, { hp: 1, maxHp: 1, life: RELICS.life, relic: n % 3 });
    }
  }

  /** A hero who walks onto a relic takes it. */
  private pickUpRelics(): void {
    for (const r of this.ents) {
      if (r.kind !== 'relic' || !r.alive) continue;
      if (r.life > 0 && r.life <= 1) { r.alive = false; continue; }
      let taker: Ent | null = null;
      let best = Infinity;
      for (const h of this.ents) {
        if (h.kind !== 'hero' || !h.alive || h.hp <= 0) continue;
        const d = dist2(h.x, h.y, r.x, r.y);
        if (d <= RELICS.pickup * RELICS.pickup && d < best) { taker = h; best = d; }
      }
      if (!taker) continue;
      const p = taker.homeOwner as Player;
      if (r.relic === 0) {
        this.players[p].mana = Math.min(MANA.max, this.players[p].mana + RELICS.mana);
        this.say(r.x, r.y - 100, `+${RELICS.mana / MANA.perMana} ${MANA.name}`, 'mana');
      } else if (r.relic === 1) {
        this.giveXp(taker, RELICS.xp);
        this.say(r.x, r.y - 100, `+${RELICS.xp} XP`, 'xp');
      } else {
        this.hasteFor(taker, 30, RELICS.boostTicks);
        this.shieldFor(taker, 300, RELICS.boostTicks);
        this.say(r.x, r.y - 100, 'Relic boost!', 'level');
      }
      r.alive = false;
      r.hp = 0;
    }
  }

  private endFarm(h: Ent): void {
    const prev = h.prevOrder.type === 'farm' || h.prevOrder.type === 'ward' || h.prevOrder.type === 'attack' ? { ...NO_ORDER, lane: h.order.lane } : h.prevOrder;
    h.order = prev;
    h.targetId = 0;
    if (prev.type === 'push') this.setPathFrom(h, prev.lane, nearestS(LANES[prev.lane], h.x, h.y));
    if (prev.type === 'gank') this.updateGankGoal(h);
  }

  /** Where a ganking hero heads: the front of the fight in the target lane. */
  updateGankGoal(h: Ent): void {
    const lane = LANES[h.order.lane];
    const p = h.homeOwner as Player;
    // Most advanced visible enemy in the lane (closest to our Core), else our most advanced unit, else the river.
    let bestU = -1;
    for (const e of this.ents) {
      if (!e.alive || e.kind !== 'unit' || e.lane !== lane.id || e.owner !== 1 - p) continue;
      const u = p === 0 ? lane.length - nearestS(lane, e.x, e.y) : nearestS(lane, e.x, e.y); // enemy's progress
      if (u > bestU) bestU = u;
    }
    let s: number;
    if (bestU >= 0) s = uToS(lane, (1 - p) as Player, bestU);
    else {
      let ownU = -1;
      for (const e of this.ents) {
        if (!e.alive || e.kind !== 'unit' || e.lane !== lane.id || e.owner !== p) continue;
        const u = p === 0 ? nearestS(lane, e.x, e.y) : lane.length - nearestS(lane, e.x, e.y);
        if (u > ownU) ownU = u;
      }
      s = ownU >= 0 ? uToS(lane, p, ownU) : idiv(lane.length, 2);
    }
    const [x, y] = pointAt(lane, s);
    h.goalX = x;
    h.goalY = y;
  }

  private respawnHero(h: Ent): void {
    const p = h.homeOwner as Player;
    const [x, y] = [CORES[p][0], CORES[p][1] + (p === 0 ? -420 : 420)];
    Object.assign(h, {
      alive: true, x, y, px: x, py: y, targetId: 0, slow: 0, stun: 0, silence: 0, dot: 0, mark: 0, charm: 0,
      duelWith: 0, duel: 0, ambushLeft: 0, hidden: false, veil: 0, shield: 0, shieldTicks: 0, regen: 0,
    });
    this.refreshHero(h);
    h.hp = h.maxHp;
    h.ultReady = h.level >= HERO_RULES.ultLevel && !KITS[h.hero as HeroKind].passiveUlt;
    h.ultArmed = false;
    if (h.order.type === 'push') this.setPathFrom(h, h.order.lane, nearestS(LANES[h.order.lane], x, y));
    if (h.order.type === 'gank') this.updateGankGoal(h);
    if (h.order.type === 'farm' || h.order.type === 'ward' || h.order.type === 'attack') this.endFarm(h);
    h.fallback = false;
  }

  private updateStructure(e: Ent): void {
    if (!e.alive || e.hp <= 0) return;
    if (e.atkCd > 0) e.atkCd--;
    // A tower's reach counts from its edge, like everyone else's attack (see inRange); without its
    // own radius here, long-range attackers could stand just outside and never be shot back.
    const reach = e.range + e.r;
    let t = this.currentTarget(e, reach);
    if (!t || (this.tick + e.id) % 4 === 0) {
      const n = this.acquire(e, reach);
      if (n && (!t || n.id !== t.id)) { t = n; e.targetId = n.id; }
    }
    if (t) this.engage(e, t, 0);
  }

  private updateCamp(c: Ent): void {
    if (!c.alive) {
      if (--c.respawn <= 0) Object.assign(c, { alive: true, hp: c.maxHp, lastHitId: 0, lastHitOwner: -1 });
      return;
    }
    if (c.hp <= 0) return;
    if (c.atkCd > 0) c.atkCd--;
    const t = c.lastHitId ? this.get(c.lastHitId) : undefined;
    if (!t || !t.alive || t.hp <= 0 || !within(c.x, c.y, t.x, t.y, 900)) {
      if (c.hp < c.maxHp && this.tick - c.lastHitTick > NEUTRALS.resetAfter) { c.hp = c.maxHp; c.lastHitId = 0; }
      return;
    }
    if (within(c.x, c.y, t.x, t.y, c.range + c.r + t.r) && c.atkCd <= 0) {
      this.damage(t, c.damage, c, {});
      c.atkCd = c.attackTicks;
      this.events.push({ k: 'hit', x1: c.x, y1: c.y, x2: t.x, y2: t.y, ranged: false, owner: NEUTRAL });
    }
  }

  // ---------- damage and deaths ----------

  /**
   * All damage goes through here. Returns the damage actually taken.
   * spell: from a hero power (Senja resists it). pure: damage over time (no shields, no blocks).
   */
  private damage(t: Ent, amount: number, src: Ent | null, opts: { spell?: boolean; pure?: boolean; owner?: number }): number {
    if (!t.alive || t.hp <= 0) return 0;
    const srcOwner = opts.owner ?? (src ? src.owner : -1);
    // A duel shuts everyone else out.
    if (t.duelWith && !opts.pure && (!src || src.id !== t.duelWith)) return 0;
    if (t.kind === 'ward') {
      if (!src || src.kind !== 'hero') return 0;
      t.hp -= 1;
      t.lastHitOwner = srcOwner;
      t.lastHitId = src.id;
      return 1;
    }
    let dmg = amount;
    if (t.kind === 'tower' && this.tick < MATCH.towerShieldUntil) dmg = pct(dmg, MATCH.towerShieldPercent);
    if ((t.kind === 'tower' || t.kind === 'core') && this.tick >= MATCH.regulation) dmg = pct(dmg, MATCH.suddenTowerDamagePercent);
    if (t.kind === 'unit' && t.unit) {
      const st = UNITS[t.unit];
      if (st.armor) dmg = pct(dmg, st.armor);
      if (st.armorRanged && src && src.range >= 300) dmg = pct(dmg, st.armorRanged);
    }
    if (t.mark > 0 && srcOwner === t.markBy) dmg = pct(dmg, 150);
    if (t.kind === 'hero') {
      const kit = KITS[t.hero as HeroKind];
      if (kit.incoming) dmg = kit.incoming(this, t, dmg, src, !!opts.spell, !!opts.pure);
      dmg = this.itemMul(t, 'armorPct', dmg);
    }
    if (dmg <= 0) return 0;
    if (t.shield > 0 && !opts.pure) {
      const absorbed = Math.min(t.shield, dmg);
      t.shield -= absorbed;
      dmg -= absorbed;
      if (t.shield <= 0) t.shieldTicks = 0;
      if (dmg <= 0) return 0;
    }
    dmg = Math.max(1, dmg);
    if (t.hp - dmg <= 0 && t.kind === 'hero') {
      const kit = KITS[t.hero as HeroKind];
      if (kit.onLethal && t.ultReady && t.ultArmed && t.silence <= 0 && kit.onLethal(this, t)) { this.ultFired(t); return 0; }
    }
    t.hp -= dmg;
    t.lastHitOwner = srcOwner;
    t.lastHitId = src ? src.id : 0;
    t.lastHitTick = this.tick;
    if (src && src.kind === 'hero' && src.hero) KITS[src.hero].onDealt?.(this, src, t, dmg);
    return dmg;
  }

  private separate(): void {
    const movers = this.ents.filter((e) => e.alive && e.hp > 0 && (e.kind === 'unit' || e.kind === 'hero') && e.speed > 0);
    for (let i = 0; i < movers.length; i++) {
      const a = movers[i];
      for (let j = i + 1; j < movers.length; j++) {
        const b = movers[j];
        if (a.flying !== b.flying) continue; // fliers pass over ground units
        // Heroes walk through their own side (troops and heroes): otherwise a hero sent against the
        // flow of its own wave, or past a teammate holding a spot, gets shoved back and looks stuck.
        if (a.owner === b.owner && (a.kind === 'hero' || b.kind === 'hero')) continue;
        const rs = a.r + b.r - 10;
        const dx = b.x - a.x;
        if (dx > rs || dx < -rs) continue;
        const dy = b.y - a.y;
        if (dy > rs || dy < -rs) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rs * rs) continue;
        let d = isqrt(d2);
        let ux = dx;
        let uy = dy;
        if (d === 0) { ux = (a.id + b.id) % 2 === 0 ? 1 : -1; uy = 0; d = 1; }
        const push = idiv(rs - d, 2) + 1;
        const px = idiv(ux * push, d);
        const py = idiv(uy * push, d);
        // A sideways nudge as well, so two pieces meeting head-on slide past each other
        // instead of pushing straight back and locking up.
        const sx = idiv(-uy * push, 2 * d);
        const sy = idiv(ux * push, 2 * d);
        a.x -= px - sx; a.y -= py - sy;
        b.x += px - sx; b.y += py - sy;
      }
    }
    for (const e of movers) {
      e.x = clamp(e.x, FIELD.minX, FIELD.maxX);
      e.y = clamp(e.y, FIELD.minY, FIELD.maxY);
    }
  }

  private updateHidden(): void {
    for (const h of this.ents) {
      if (h.kind !== 'hero') continue;
      if (!h.alive) { h.hidden = false; continue; }
      const def = HEROES[h.hero as HeroKind];
      const wasHidden = h.hidden;
      let hidden: boolean;
      if (def.flying) hidden = false;
      else if (h.veil > 0) hidden = true;
      else {
        const fog = this.zones.some((z) => z.kind === 'fog' && z.owner === h.owner && within(z.x, z.y, h.x, h.y, z.r));
        hidden = fog || inJungle(h.x, h.y, this.lanes);
        const revealR = fog ? 250 : HERO_RULES.revealRadius;
        let spotted = false;
        let trueSight = false;
        if (hidden) {
          for (const e of this.ents) {
            if (!e.alive || e.hp <= 0 || e.owner === h.owner || e.owner === NEUTRAL) continue;
            if (e.kind === 'hero' && e.hero === 'seri' && within(h.x, h.y, e.x, e.y, 900)) { trueSight = true; break; }
            if (e.kind === 'hero') { const ts = this.itemStat(e, 'trueSight'); if (ts > 0 && within(h.x, h.y, e.x, e.y, ts)) { trueSight = true; break; } }
            if (within(h.x, h.y, e.x, e.y, revealR)) spotted = true;
          }
          for (const z of this.zones) {
            if (z.kind === 'lantern' && z.owner !== h.owner && within(z.x, z.y, h.x, h.y, z.r)) trueSight = true;
          }
          for (const w of this.ents) {
            if (w.kind === 'ward' && w.alive && w.owner !== h.owner && within(w.x, w.y, h.x, h.y, WARDS.radius)) trueSight = true;
          }
        }
        if (trueSight) hidden = false;
        else if (spotted) {
          // Rimba's Forest Step: stays hidden a little longer after being spotted.
          if (h.hero === 'rimba' && wasHidden && h.grace > 0) { h.grace--; hidden = true; } else hidden = false;
        } else if (hidden && h.hero === 'rimba') h.grace = sec(2);
      }
      h.hidden = hidden;
      if (hidden) h.ambushLeft = HERO_RULES.ambushWindow;
      else if (h.ambushLeft > 0) h.ambushLeft--;
    }
  }

  giveXp(h: Ent, amount: number): void {
    h.heroXp += amount;
    if (!h.alive) return;
    while (h.level < XP.levels.length && h.heroXp >= XP.levels[h.level]) {
      h.level++;
      this.refreshHero(h);
      this.say(h.x, h.y - 150, `Level ${h.level}!`, 'level');
      if (h.level === HERO_RULES.ultLevel) {
        const kit = KITS[h.hero as HeroKind];
        if (kit.passiveUlt) { kit.passiveUlt(this, h); this.refreshHero(h); this.say(h.x, h.y - 190, HEROES[h.hero as HeroKind].ult.name, 'ult'); }
        else h.ultReady = true;
      }
    }
  }

  private shareXp(dead: Ent, amount: number): void {
    for (const h of this.ents) {
      if (h.kind === 'hero' && h.alive && h.hp > 0 && h.owner !== dead.owner && h.owner !== NEUTRAL && within(h.x, h.y, dead.x, dead.y, XP.radius)) {
        this.giveXp(h, amount);
      }
    }
  }

  private resolveDeaths(): void {
    for (const e of this.ents) {
      if (!e.alive || e.hp > 0) continue;
      e.alive = false;
      e.hp = 0;
      if (e.duelWith) {
        // Pendekar's Duel: winning it gives +10% damage for the match.
        const other = this.get(e.duelWith);
        if (other && other.alive && other.hp > 0 && other.hero === 'pendekar') {
          other.bonusPct += 10;
          this.say(other.x, other.y - 150, 'Duel won!', 'ult');
        }
        this.endDuel(e);
      }
      switch (e.kind) {
        case 'unit':
          if (e.xpValue > 0) this.shareXp(e, e.xpValue);
          this.events.push({ k: 'death', x: e.x, y: e.y, owner: e.owner, big: false });
          break;
        case 'hero': {
          this.shareXp(e, XP.hero);
          // Bounty (DEC-009): ganks pay. More for ending a streak, and for the first kill of the match.
          const side = e.lastHitOwner;
          if ((side === 0 || side === 1) && side !== e.homeOwner) {
            let bounty = BOUNTY.heroKill + (e.streak >= 2 ? BOUNTY.streak : 0);
            if (!this.firstKill) { bounty += BOUNTY.firstKill; this.firstKill = true; this.say(e.x, e.y - 170, 'First Strike!', 'ult'); }
            const pl = this.players[side];
            pl.mana = Math.min(MANA.max, pl.mana + bounty);
            this.say(e.x, e.y - 130, `+${bounty / MANA.perMana} ${MANA.name}`, 'mana');
            const killer = e.lastHitId ? this.get(e.lastHitId) : undefined;
            if (killer && killer.kind === 'hero' && killer.alive) killer.streak++;
          }
          e.streak = 0;
          e.fury = 0;
          e.respawn = HERO_RULES.respawnBase + HERO_RULES.respawnPerLevel * e.level;
          e.respawnTotal = e.respawn;
          e.targetId = 0;
          e.ultReady = false;
          this.events.push({ k: 'death', x: e.x, y: e.y, owner: e.owner, big: true });
          break;
        }
        case 'ward': {
          // Clearing an enemy ward pays a bounty (a ward that runs out pays nothing).
          const by = e.lastHitId ? this.get(e.lastHitId) : undefined;
          if (by && by.kind === 'hero' && by.homeOwner !== e.owner && e.life !== 0) {
            const pl = this.players[by.homeOwner as Player];
            pl.mana = Math.min(MANA.max, pl.mana + WARDS.bountyMana);
            this.giveXp(by, WARDS.bountyXp);
            this.say(e.x, e.y - 100, 'Ward cleared', 'mana');
          }
          break;
        }
        case 'relic':
          break;
        case 'tower': {
          const winner = (1 - e.owner) as Player;
          this.players[winner].towersDestroyed++;
          this.players[winner].mana = Math.min(MANA.max, this.players[winner].mana + BOUNTY.tower);
          this.shareXp(e, XP.tower);
          this.events.push({ k: 'death', x: e.x, y: e.y, owner: e.owner, big: true });
          if (this.tick >= MATCH.regulation && !this.result) this.result = { winner, reason: 'sudden' };
          break;
        }
        case 'core':
          this.events.push({ k: 'death', x: e.x, y: e.y, owner: e.owner, big: true });
          if (!this.result) this.result = { winner: (1 - e.owner) as Player, reason: 'core' };
          break;
        case 'camp': {
          const n = NEUTRALS[e.campKind];
          e.respawn = n.respawn;
          e.respawnTotal = n.respawn;
          const killer = e.lastHitId ? this.get(e.lastHitId) : undefined;
          const side = e.lastHitOwner === 0 || e.lastHitOwner === 1 ? (e.lastHitOwner as Player) : null;
          let mana: number = n.mana;
          let xp: number = n.xp;
          if (killer && killer.kind === 'hero' && killer.hero === 'belang') {
            // Belang's Hunter's Hunger
            mana += MANA.perMana;
            xp *= 2;
            this.heal(killer, pct(killer.maxHp, 25));
          }
          if (side !== null && mana > 0) {
            const pl = this.players[side];
            pl.mana = Math.min(MANA.max, pl.mana + mana);
            this.say(e.x, e.y - 120, `+${mana / MANA.perMana} ${MANA.name}`, 'mana');
          }
          if (killer && killer.kind === 'hero') {
            this.giveXp(killer, xp);
            if (e.campKind === 'den') { killer.fury = FURY.ticks; this.say(killer.x, killer.y - 150, 'Jungle Fury!', 'level'); }
          }
          if (e.campKind === 'boss' && side !== null) {
            // Gajah Mina joins the side that beat it and charges down the middle (or nearest) lane.
            const lane: LaneId = this.lanes.includes(1) ? 1 : (side === 0 ? 2 : 0);
            const ally = this.summon(side, 'gajahmina', e.x, e.y, lane);
            ally.xpValue = UNITS.gajahmina.xp;
            this.say(e.x, e.y - 180, 'Gajah Mina joins you!', 'ult');
          }
          break;
        }
      }
    }
  }
}

function validPicks(p: HeroKind[]): HeroKind[] {
  const out = p.filter((k, i) => HEROES[k] !== undefined && p.indexOf(k) === i).slice(0, HERO_RULES.heroesPerPlayer);
  for (const k of DEFAULT_PICKS) if (out.length < HERO_RULES.heroesPerPlayer && !out.includes(k)) out.push(k);
  return out;
}

export type { Lane };
