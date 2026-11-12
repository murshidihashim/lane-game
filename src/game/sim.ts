// The match simulation. Pure rules: no drawing, no timers, no floating-point maths.
// Same seed + same commands => exactly the same match on every device.
import { type Pt, Rng, clamp, dist2, hashInts, idiv, isqrt, pct, within } from './math';
import {
  CAMPS, CORES, FIELD, LANES, LANE_HALF, type Lane, type LaneId, activeLanes, inJungle, laneDist2,
  nearestS, pointAt, directionAt, towerPos, uToS,
} from './map';
import {
  ALL_CARDS, CAMP, CARDS, DEPLOY, FIREBOLT, HAND_SIZE, HEROES, HERO_IDS, HERO_RULES, MANA, MATCH, STRUCTURES,
  TROOP_DECK, UNITS, WAVES, XP, type CardId, type HeroKind, type Targets, type UnitKind, sec,
} from './rules';
import { KITS } from './heroes';

export type Player = 0 | 1;
export const NEUTRAL = 2;
export type Owner = Player | typeof NEUTRAL;
export type EntKind = 'unit' | 'hero' | 'tower' | 'core' | 'camp';
export type OrderType = 'push' | 'defend' | 'gank' | 'farm' | 'retreat';

export interface Order {
  type: OrderType;
  /** Lane for push / gank / defend (the tower's lane). */
  lane: LaneId;
  /** Camp index for farm. */
  camp: number;
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
  // camps
  camp: number;
  respawnTotal: number;
}

export type Command =
  | { t: 'card'; player: Player; card: CardId; lane: LaneId; u: number }
  | { t: 'spell'; player: Player; card: CardId; x: number; y: number }
  | { t: 'order'; player: Player; hero: HeroKind; order: OrderType; lane?: LaneId; camp?: number };

export type GameEvent =
  | { k: 'hit'; x1: number; y1: number; x2: number; y2: number; ranged: boolean; owner: Owner }
  | { k: 'boom'; x: number; y: number; r: number; owner: Owner }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; owner: Owner }
  | { k: 'text'; x: number; y: number; text: string; tone: 'mana' | 'xp' | 'ambush' | 'level' | 'info' | 'ult' }
  | { k: 'death'; x: number; y: number; owner: Owner; big: boolean };

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
  mana: number; // points; MANA.perMana points = 1 Semangat
  hand: CardId[];
  next: CardId | null;
  queue: CardId[];
  picks: HeroKind[];
  towersDestroyed: number; // enemy towers this player has destroyed
  heroIds: Partial<Record<HeroKind, number>>;
  lastTroop: UnitKind | null; // for Dalang's copies
  manaSlow: number; // Senja's ultimate: refill halved
  discount: number; // Saudagar's ultimate: cards cost 1 less
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
}

export interface FoeQuery {
  heroesOnly?: boolean;
  unitsOnly?: boolean; // troops and summons, no heroes
  structures?: boolean; // include towers and the Core
  hidden?: boolean; // include hidden heroes
}

const NO_ORDER: Order = { type: 'push', lane: 0, camp: 0 };
export const DEFAULT_PICKS: HeroKind[] = ['rimba', 'benteng'];

/** Two different heroes picked at random from a seed (used for the bot and for tests). */
export function randomPicks(seed: number): HeroKind[] {
  const rng = new Rng((seed ^ 0x2545f491) >>> 0);
  const a = HERO_IDS[rng.int(HERO_IDS.length)];
  let b = HERO_IDS[rng.int(HERO_IDS.length)];
  while (b === a) b = HERO_IDS[rng.int(HERO_IDS.length)];
  return [a, b];
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
  private spells: { owner: Player; x: number; y: number; at: number }[] = [];

  constructor(opts: SimOptions) {
    this.seed = opts.seed >>> 0;
    this.laneCount = opts.lanes ?? 3;
    this.lanes = activeLanes(this.laneCount);
    this.waves = opts.waves ?? true;
    this.rng = new Rng(this.seed);
    const picks = opts.picks ?? [DEFAULT_PICKS, DEFAULT_PICKS];
    this.players = [this.newPlayer(validPicks(picks[0])), this.newPlayer(validPicks(picks[1]))];
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
    CAMPS.forEach((pt, i) => {
      const c = this.spawn('camp', NEUTRAL, pt[0], pt[1], CAMP.radius);
      Object.assign(c, { hp: CAMP.hp, maxHp: CAMP.hp, damage: CAMP.damage, attackTicks: CAMP.attackTicks, range: CAMP.range, camp: i });
    });
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

  /** What a card costs this player right now (Saudagar's ultimate makes cards cheaper). */
  costOf(p: Player, card: CardId): number {
    const base = CARDS[card].cost;
    return this.players[p].discount > 0 ? Math.max(1, base - 1) : base;
  }

  canAfford(p: Player, card: CardId): boolean {
    return this.players[p].mana >= this.costOf(p, card) * MANA.perMana;
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

  camps(): Ent[] {
    return this.ents.filter((e) => e.kind === 'camp');
  }

  /** Furthest distance (from the player's own end) a card can be dropped in a lane. */
  maxU(p: Player, laneId: LaneId): number {
    const lane = LANES[laneId];
    const enemyTower = this.towerOf((1 - p) as Player, laneId);
    if (enemyTower && !enemyTower.alive) return lane.length - lane.towerS; // where the enemy tower stood
    return idiv(lane.length, 2) - DEPLOY.riverGap;
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

  /** Can player p currently see entity e? (Only heroes can be hidden.) */
  visibleTo(e: Ent, p: Player): boolean {
    return e.owner === p || !e.hidden;
  }

  hash(): number {
    const v: number[] = [this.tick, this.rng.state(), this.nextId, this.result ? 1 + (this.result.winner ?? 2) : 0];
    for (const pl of this.players) {
      v.push(pl.mana, pl.towersDestroyed, pl.queue.length, pl.manaSlow, pl.discount, ...pl.hand.map((c) => ALL_CARDS.indexOf(c)));
    }
    for (const z of this.zones) v.push(z.id, z.x, z.y, z.r, z.until);
    for (const e of this.ents) {
      v.push(e.id, e.owner, e.alive ? 1 : 0, e.x, e.y, e.hp, e.maxHp, e.atkCd, e.targetId, e.wp, e.deploy, e.slow, e.stun,
        e.silence, e.shield, e.dot, e.charm, e.duel, e.life, e.level, e.heroXp, e.respawn, e.powerCd, e.ultReady ? 1 : 0,
        e.ambushLeft, e.hidden ? 1 : 0, e.order.lane, e.camp, e.bonusPct);
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

  /** Damage from a hero power or spell. Returns the damage dealt. */
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

    if (this.waves && this.tick >= WAVES.first && (this.tick - WAVES.first) % WAVES.every === 0) this.spawnWaves();

    this.spells = this.spells.filter((s) => {
      if (s.at > this.tick) return true;
      this.firebolt(s.owner, s.x, s.y);
      return false;
    });

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
    this.updateHidden();
    this.resolveDeaths();
    this.ents = this.ents.filter((e) => e.alive || e.kind !== 'unit');

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
      if (pl.discount > 0) pl.discount--;
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
    if (c.t === 'order') return this.applyOrder(c);
    const handIndex = pl.hand.indexOf(c.card);
    if (handIndex < 0) return false;
    const def = CARDS[c.card];
    const cost = this.costOf(c.player, c.card) * MANA.perMana;
    if (pl.mana < cost) return false;
    if (c.t === 'spell') {
      if (def.kind !== 'spell') return false;
      const x = clamp(Math.trunc(c.x), FIELD.minX, FIELD.maxX);
      const y = clamp(Math.trunc(c.y), FIELD.minY, FIELD.maxY);
      this.spells.push({ owner: c.player, x, y, at: this.tick + FIREBOLT.delay });
    } else {
      if (def.kind === 'spell' || !this.lanes.includes(c.lane)) return false;
      const lane = LANES[c.lane];
      const u = clamp(Math.trunc(c.u), DEPLOY.minU, this.maxU(c.player, c.lane));
      const s = uToS(lane, c.player, u);
      if (def.kind === 'hero' && def.hero) {
        if (pl.heroIds[def.hero] !== undefined) return false;
        const [x, y] = pointAt(lane, s);
        const h = this.spawnHero(c.player, def.hero, x, y, c.lane);
        h.deploy = DEPLOY.delay;
        this.setPathFrom(h, c.lane, s);
      } else if (def.unit) {
        this.spawnSquad(c.player, def.unit, def.count ?? 1, c.lane, s);
        pl.lastTroop = def.unit;
      }
    }
    pl.mana -= cost;
    pl.hand[handIndex] = pl.next ?? c.card;
    pl.next = pl.queue.shift() ?? null;
    if (def.kind !== 'hero') pl.queue.push(c.card);
    return true;
  }

  private applyOrder(c: Extract<Command, { t: 'order' }>): boolean {
    const h = this.heroOf(c.player, c.hero);
    if (!h) return false;
    const lane = c.lane ?? h.order.lane;
    let order: Order;
    switch (c.order) {
      case 'push': case 'gank': case 'defend':
        if (!this.lanes.includes(lane)) return false;
        order = { type: c.order, lane, camp: 0 };
        break;
      case 'farm': {
        const camp = c.camp ?? 0;
        if (camp < 0 || camp >= CAMPS.length) return false;
        order = { type: 'farm', lane: h.order.lane, camp };
        break;
      }
      case 'retreat':
        order = { type: 'retreat', lane: h.order.lane, camp: 0 };
        break;
    }
    if (order.type === 'gank' && h.alive && this.heroLane(h) === order.lane) order.type = 'push';
    if (order.type === 'farm') h.prevOrder = h.order.type === 'farm' ? h.prevOrder : h.order;
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
      if (kit.onTeamGank && this.canUlt(ally)) {
        if (kit.onTeamGank(this, ally, h)) this.ultFired(ally);
      }
    }
  }

  // ---------- spawning ----------

  private newPlayer(picks: HeroKind[]): PlayerState {
    const deck: CardId[] = [...TROOP_DECK, ...picks];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return {
      mana: MANA.start, hand: deck.slice(0, HAND_SIZE), next: deck[HAND_SIZE], queue: deck.slice(HAND_SIZE + 1), picks,
      towersDestroyed: 0, heroIds: {}, lastTroop: null, manaSlow: 0, discount: 0,
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
      order: NO_ORDER, prevOrder: NO_ORDER, goalX: x, goalY: y, camp: 0, respawnTotal: 0,
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
      range: st.range, sight: st.sight, speed: st.speed, targets: st.targets, xpValue: st.xp,
    });
    this.setPathFrom(e, laneId, s);
    return e;
  }

  private spawnSquad(owner: Player, kind: UnitKind, count: number, laneId: LaneId, s: number): void {
    const lane = LANES[laneId];
    const [cx, cy] = pointAt(lane, s);
    const [dx, dy] = directionAt(lane, s);
    const len = Math.max(1, isqrt(dx * dx + dy * dy));
    const fwd = owner === 0 ? 1 : -1;
    const offsets: Pt[] = count === 1 ? [[0, 0]] : count === 2 ? [[-90, 0], [90, 0]] : count === 3 ? [[-110, 0], [0, 60], [110, 0]] : [[-80, 60], [80, 60], [-80, -60], [80, -60]];
    for (const [side, ahead] of offsets) {
      // side: across the lane; ahead: along the lane, towards the enemy
      const x = cx + idiv(-dy * side, len) + idiv(dx * ahead * fwd, len);
      const y = cy + idiv(dx * side, len) + idiv(dy * ahead * fwd, len);
      const u = this.spawnUnit(owner, kind, x, y, laneId, s);
      u.deploy = DEPLOY.delay;
    }
  }

  private spawnHero(owner: Player, kind: HeroKind, x: number, y: number, laneId: LaneId): Ent {
    const st = HEROES[kind];
    const h = this.spawn('hero', owner, x, y, st.radius);
    Object.assign(h, {
      hero: kind, range: st.range, sight: st.sight, speed: st.speed, targets: st.targets, xpValue: st.xp,
      flying: st.flying, powerCd: idiv(st.powerTicks, 2),
      order: { type: 'push', lane: laneId, camp: 0 } satisfies Order,
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
    h.maxHp = pct(pct(st.hp, scale), h.transformed ? 140 : 100);
    h.damage = pct(st.damage, scale);
    h.attackTicks = h.transformed ? pct(st.attackTicks, 77) : st.attackTicks;
    if (oldMax > 1 && h.alive) h.hp = Math.min(h.maxHp, h.hp + (h.maxHp - oldMax));
  }

  private spawnWaves(): void {
    for (const id of this.lanes) {
      const lane = LANES[id];
      for (const p of [0, 1] as const) {
        const s = uToS(lane, p, WAVES.spawnU);
        const [cx, cy] = pointAt(lane, s);
        const [dx, dy] = directionAt(lane, s);
        const len = Math.max(1, isqrt(dx * dx + dy * dy));
        for (let i = 0; i < WAVES.size; i++) {
          const side = (i - 1) * 90;
          this.spawnUnit(p, 'minion', cx + idiv(-dy * side, len), cy + idiv(dx * side, len), id, s);
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
    if (e.kind === 'hero') {
      const kit = KITS[e.hero as HeroKind];
      if (kit.speedPct) s = pct(s, kit.speedPct(this, e));
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
    if (t.kind === 'camp') return false;
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
      let bonus = e.bonusPct + (e.dmgBuff > 0 ? e.dmgBuffPct : 0);
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
    const dealt = this.damage(t, dmg, e, {});
    e.atkCd = this.attackInterval(e);
    this.events.push({ k: 'hit', x1: e.x, y1: e.y, x2: t.x, y2: t.y, ranged: e.range > 300, owner: e.owner });
    if (kit?.onHit) kit.onHit(this, e, t, dealt);
    if (ambush && kit?.onAmbush && this.canUlt(e) && kit.onAmbush(this, e, t)) this.ultFired(e);
  }

  /** Attack a target in range, or close in on it. */
  private engage(e: Ent, t: Ent, spd: number): void {
    if (this.inRange(e, t)) {
      if (e.atkCd <= 0 && e.damage > 0) this.attack(e, t);
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
    let t = this.currentTarget(e, e.sight + 200);
    if (!t || (this.tick + e.id) % 4 === 0) {
      const n = this.acquire(e, e.sight);
      if (n) { t = n; e.targetId = n.id; }
    }
    if (t) this.engage(e, t, spd);
    else if (spd > 0) this.followPath(e, spd);
  }

  private anchorFor(h: Ent): Pt {
    const p = h.homeOwner as Player;
    const toRiver = p === 0 ? -1 : 1;
    if (h.order.type === 'defend') {
      const [x, y] = towerPos(LANES[h.order.lane], p);
      return [x, y + 250 * toRiver];
    }
    return [CORES[p][0], CORES[p][1] + 420 * toRiver];
  }

  private canUlt(h: Ent): boolean {
    return h.alive && h.hp > 0 && h.ultReady && h.silence <= 0 && h.stun <= 0 && h.deploy <= 0;
  }

  private ultFired(h: Ent): void {
    h.ultReady = false;
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
    const spd = this.speedOf(h);
    const o = h.order;

    if (o.type === 'gank') {
      if (this.tick % 10 === 0) this.updateGankGoal(h);
      // Arrive at the goal, or as soon as the hero reaches the lane with an enemy in attack range.
      const atLane = laneDist2(LANES[o.lane], h.x, h.y) <= (LANE_HALF + 250) * (LANE_HALF + 250);
      const strike = atLane && this.acquire(h, h.range) !== null;
      if (strike || this.moveTo(h, h.goalX, h.goalY, spd) || within(h.x, h.y, h.goalX, h.goalY, HERO_RULES.gankArrive)) {
        h.order = { type: 'push', lane: o.lane, camp: 0 };
        h.gankBonus = HERO_RULES.gankBonusTicks;
        this.setPathFrom(h, o.lane, nearestS(LANES[o.lane], h.x, h.y));
      }
      return;
    }

    // Powers fire by themselves (DEC-004, DEC-007). Silence stops them.
    if (h.silence <= 0) {
      if (this.canUlt(h) && kit.ult && kit.ult(this, h)) this.ultFired(h);
      if (h.powerCd <= 0 && kit.power(this, h, this.rank(h))) {
        h.powerCd = def.powerTicks;
        this.say(h.x, h.y - 140, def.power.name, 'info');
      }
    }
    if (!h.alive || h.hp <= 0 || h.stun > 0) return;

    // A duel overrides orders: fight the duel partner.
    if (h.duelWith) {
      const t = this.get(h.duelWith);
      if (t && t.alive && t.hp > 0) { this.engage(h, t, spd); return; }
    }

    if (o.type === 'farm') {
      const camp = this.camps()[o.camp];
      if (!camp || !camp.alive) { this.endFarm(h); return; }
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

    if (o.type === 'push') {
      let t = this.currentTarget(h, h.sight + 200);
      if (!t || (this.tick + h.id) % 4 === 0) {
        const n = this.acquire(h, h.sight);
        if (n) { t = n; h.targetId = n.id; }
      }
      if (t) this.engage(h, t, spd);
      else {
        const limit = kit.pushLimit?.(this, h);
        if (limit === undefined || this.uOf(h.lane, p, h.x, h.y) < limit) this.followPath(h, spd);
      }
      return;
    }

    // defend / retreat: hold an anchor point, fight what comes close, don't chase far.
    const [ax, ay] = this.anchorFor(h);
    const leash = o.type === 'defend' ? HERO_RULES.defendLeash : 700;
    let t = this.currentTarget(h, h.sight + 200);
    if (t && !within(ax, ay, t.x, t.y, leash)) { t = null; h.targetId = 0; }
    if (!t) {
      const n = this.acquire(h, h.sight, h.x, h.y, (c) => within(ax, ay, c.x, c.y, leash));
      if (n) { t = n; h.targetId = n.id; }
    }
    if (t) this.engage(h, t, spd);
    else this.moveTo(h, ax, ay, spd);
    if (o.type === 'retreat' && this.tick % 20 === 0) {
      const core = CORES[p];
      if (within(h.x, h.y, core[0], core[1], HERO_RULES.retreatHealRadius)) {
        h.hp = Math.min(h.maxHp, h.hp + pct(h.maxHp, HERO_RULES.retreatHealPerSecondPercent));
      }
    }
  }

  private endFarm(h: Ent): void {
    const prev = h.prevOrder.type === 'farm' ? { type: 'push' as const, lane: h.order.lane, camp: 0 } : h.prevOrder;
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
    if (h.order.type === 'push') this.setPathFrom(h, h.order.lane, nearestS(LANES[h.order.lane], x, y));
    if (h.order.type === 'gank') this.updateGankGoal(h);
    if (h.order.type === 'farm') this.endFarm(h);
  }

  private updateStructure(e: Ent): void {
    if (!e.alive || e.hp <= 0) return;
    if (e.atkCd > 0) e.atkCd--;
    let t = this.currentTarget(e, e.range);
    if (!t || (this.tick + e.id) % 4 === 0) {
      const n = this.acquire(e, e.range);
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
      if (c.hp < c.maxHp && this.tick - c.lastHitTick > CAMP.resetAfter) { c.hp = c.maxHp; c.lastHitId = 0; }
      return;
    }
    if (within(c.x, c.y, t.x, t.y, c.range + c.r + t.r) && c.atkCd <= 0) {
      this.damage(t, c.damage, c, {});
      c.atkCd = c.attackTicks;
      this.events.push({ k: 'hit', x1: c.x, y1: c.y, x2: t.x, y2: t.y, ranged: false, owner: NEUTRAL });
    }
  }

  // ---------- damage, spells, deaths ----------

  /**
   * All damage goes through here. Returns the damage actually taken.
   * spell: from a spell or hero power (Senja resists it). pure: damage over time (no shields, no blocks).
   */
  private damage(t: Ent, amount: number, src: Ent | null, opts: { spell?: boolean; pure?: boolean; owner?: number }): number {
    if (!t.alive || t.hp <= 0) return 0;
    const srcOwner = opts.owner ?? (src ? src.owner : -1);
    // A duel shuts everyone else out.
    if (t.duelWith && !opts.pure && (!src || src.id !== t.duelWith)) return 0;
    let dmg = amount;
    if (t.kind === 'tower' && this.tick < MATCH.towerShieldUntil) dmg = pct(dmg, MATCH.towerShieldPercent);
    if (t.mark > 0 && srcOwner === t.markBy) dmg = pct(dmg, 150);
    if (t.kind === 'hero') {
      const kit = KITS[t.hero as HeroKind];
      if (kit.incoming) dmg = kit.incoming(this, t, dmg, src, !!opts.spell, !!opts.pure);
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
      if (kit.onLethal && t.ultReady && t.silence <= 0 && kit.onLethal(this, t)) { this.ultFired(t); return 0; }
    }
    t.hp -= dmg;
    t.lastHitOwner = srcOwner;
    t.lastHitId = src ? src.id : 0;
    t.lastHitTick = this.tick;
    if (src && src.kind === 'hero' && src.hero) KITS[src.hero].onDealt?.(this, src, t, dmg);
    return dmg;
  }

  private firebolt(owner: Player, x: number, y: number): void {
    this.events.push({ k: 'boom', x, y, r: FIREBOLT.radius, owner });
    for (const t of this.ents) {
      if (!t.alive || t.hp <= 0 || t.owner === owner) continue;
      const r = FIREBOLT.radius + t.r;
      if (dist2(x, y, t.x, t.y) > r * r) continue;
      const dmg = t.kind === 'tower' || t.kind === 'core' ? pct(FIREBOLT.damage, FIREBOLT.structurePercent) : FIREBOLT.damage;
      this.damage(t, dmg, null, { spell: true, owner });
    }
  }

  private separate(): void {
    const movers = this.ents.filter((e) => e.alive && e.hp > 0 && (e.kind === 'unit' || e.kind === 'hero') && e.speed > 0);
    for (let i = 0; i < movers.length; i++) {
      const a = movers[i];
      for (let j = i + 1; j < movers.length; j++) {
        const b = movers[j];
        if (a.flying !== b.flying) continue; // fliers pass over ground units
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
        a.x -= px; a.y -= py;
        b.x += px; b.y += py;
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
            if (within(h.x, h.y, e.x, e.y, revealR)) spotted = true;
          }
          for (const z of this.zones) {
            if (z.kind === 'lantern' && z.owner !== h.owner && within(z.x, z.y, h.x, h.y, z.r)) trueSight = true;
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
        case 'hero':
          this.shareXp(e, XP.hero);
          e.respawn = HERO_RULES.respawnBase + HERO_RULES.respawnPerLevel * e.level;
          e.respawnTotal = e.respawn;
          e.targetId = 0;
          e.ultReady = false;
          this.events.push({ k: 'death', x: e.x, y: e.y, owner: e.owner, big: true });
          break;
        case 'tower': {
          const winner = (1 - e.owner) as Player;
          this.players[winner].towersDestroyed++;
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
          e.respawn = CAMP.respawn;
          e.respawnTotal = CAMP.respawn;
          const killer = e.lastHitId ? this.get(e.lastHitId) : undefined;
          let mana = CAMP.manaReward;
          let xp = XP.camp;
          if (killer && killer.kind === 'hero' && killer.hero === 'belang') {
            // Belang's Hunter's Hunger
            mana += MANA.perMana;
            xp *= 2;
            this.heal(killer, pct(killer.maxHp, 25));
          }
          if (e.lastHitOwner === 0 || e.lastHitOwner === 1) {
            const pl = this.players[e.lastHitOwner];
            pl.mana = Math.min(MANA.max, pl.mana + mana);
            this.say(e.x, e.y - 120, `+${mana / MANA.perMana} ${MANA.name}`, 'mana');
          }
          if (killer && killer.kind === 'hero') this.giveXp(killer, xp);
          break;
        }
      }
    }
  }
}

function validPicks(p: HeroKind[]): HeroKind[] {
  const out = p.filter((k, i) => HEROES[k] !== undefined && p.indexOf(k) === i).slice(0, HERO_RULES.heroesPerDeck);
  for (const k of DEFAULT_PICKS) if (out.length < HERO_RULES.heroesPerDeck && !out.includes(k)) out.push(k);
  return out;
}

export type { Lane };
