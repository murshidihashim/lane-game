// The match simulation. Pure rules: no drawing, no timers, no floating-point maths.
// Same seed + same commands => exactly the same match on every device.
import { type Pt, Rng, clamp, dist2, hashInts, idiv, isqrt, pct, within } from './math';
import {
  CAMPS, CORES, FIELD, LANES, LANE_HALF, type Lane, type LaneId, activeLanes, inJungle, laneDist2,
  nearestS, pointAt, directionAt, towerPos, uToS,
} from './map';
import {
  CAMP, CARDS, DECK, DEPLOY, FIREBOLT, HAND_SIZE, HEROES, HERO_RULES, MANA, MATCH, STRUCTURES, UNITS, WAVES, XP,
  type CardId, type HeroKind, type Targets, type UnitKind, sec,
} from './rules';

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
  slow: number; slowPct: number;
  lastHitOwner: number; lastHitId: number; lastHitTick: number;
  // heroes
  level: number; heroXp: number; respawn: number; abilityCd: number;
  ambushLeft: number; hidden: boolean;
  order: Order; prevOrder: Order;
  goalX: number; goalY: number;
  // camps
  camp: number;
}

export type Command =
  | { t: 'card'; player: Player; card: CardId; lane: LaneId; u: number }
  | { t: 'spell'; player: Player; card: CardId; x: number; y: number }
  | { t: 'order'; player: Player; hero: HeroKind; order: OrderType; lane?: LaneId; camp?: number };

export type GameEvent =
  | { k: 'hit'; x1: number; y1: number; x2: number; y2: number; ranged: boolean; owner: Owner }
  | { k: 'boom'; x: number; y: number; r: number; owner: Owner }
  | { k: 'text'; x: number; y: number; text: string; tone: 'mana' | 'xp' | 'ambush' | 'level' | 'info' }
  | { k: 'death'; x: number; y: number; owner: Owner; big: boolean };

export interface PlayerState {
  mana: number; // points; MANA.perMana points = 1 mana
  hand: CardId[];
  next: CardId | null;
  queue: CardId[];
  towersDestroyed: number; // enemy towers this player has destroyed
  heroIds: Partial<Record<HeroKind, number>>;
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
}

const NO_ORDER: Order = { type: 'push', lane: 0, camp: 0 };

export class Sim {
  readonly seed: number;
  readonly laneCount: 2 | 3;
  readonly lanes: LaneId[];
  readonly waves: boolean;
  tick = 0;
  ents: Ent[] = [];
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
    this.players = [this.newPlayer(), this.newPlayer()];
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

  canAfford(p: Player, card: CardId): boolean {
    return this.players[p].mana >= CARDS[card].cost * MANA.perMana;
  }

  get(id: number): Ent | undefined {
    for (const e of this.ents) if (e.id === id) return e;
    return undefined;
  }

  heroOf(p: Player, kind: HeroKind): Ent | undefined {
    const id = this.players[p].heroIds[kind];
    return id === undefined ? undefined : this.get(id);
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

  /** The lane a hero is in (or nearest to), used to tell a push from a gank. */
  heroLane(h: Ent): LaneId {
    if (!h.alive) return h.order.lane;
    let best = this.lanes[0];
    let bestD = Infinity;
    for (const id of this.lanes) {
      const d = laneDist2(LANES[id], h.x, h.y);
      if (d < bestD) { bestD = d; best = id; }
    }
    return best;
  }

  /** Can player p currently see entity e? (Only heroes in the jungle can be hidden.) */
  visibleTo(e: Ent, p: Player): boolean {
    return e.owner === p || !e.hidden;
  }

  hash(): number {
    const v: number[] = [this.tick, this.rng.state(), this.nextId, this.result ? 1 + (this.result.winner ?? 2) : 0];
    for (const pl of this.players) v.push(pl.mana, pl.towersDestroyed, pl.queue.length, ...pl.hand.map((c) => DECK.indexOf(c)));
    for (const e of this.ents) {
      v.push(e.id, e.alive ? 1 : 0, e.x, e.y, e.hp, e.maxHp, e.atkCd, e.targetId, e.wp, e.deploy, e.slow,
        e.level, e.heroXp, e.respawn, e.abilityCd, e.ambushLeft, e.hidden ? 1 : 0, e.order.lane, e.camp);
    }
    return hashInts(v);
  }

  // ---------- the step ----------

  step(): void {
    this.events = [];
    if (this.result) return;
    for (const e of this.ents) { e.px = e.x; e.py = e.y; }
    const cmds = this.queue;
    this.queue = [];
    for (const c of cmds) this.apply(c);

    const regen = this.doubleMana() ? MANA.doubleRegenPerTick : MANA.regenPerTick;
    for (const p of this.players) p.mana = Math.min(MANA.max, p.mana + regen);

    if (this.waves && this.tick >= WAVES.first && (this.tick - WAVES.first) % WAVES.every === 0) this.spawnWaves();

    this.spells = this.spells.filter((s) => {
      if (s.at > this.tick) return true;
      this.firebolt(s.owner, s.x, s.y);
      return false;
    });

    for (const e of this.ents) {
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

  // ---------- commands ----------

  private apply(c: Command): boolean {
    if (this.result) return false;
    const pl = this.players[c.player];
    if (c.t === 'order') return this.applyOrder(c);
    const handIndex = pl.hand.indexOf(c.card);
    if (handIndex < 0) return false;
    const def = CARDS[c.card];
    if (pl.mana < def.cost * MANA.perMana) return false;
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
      }
    }
    pl.mana -= def.cost * MANA.perMana;
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
    if (order.type === 'gank') this.updateGankGoal(h);
    return true;
  }

  // ---------- spawning ----------

  private newPlayer(): PlayerState {
    const deck = [...DECK];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return { mana: MANA.start, hand: deck.slice(0, HAND_SIZE), next: deck[HAND_SIZE], queue: deck.slice(HAND_SIZE + 1), towersDestroyed: 0, heroIds: {} };
  }

  private spawn(kind: EntKind, owner: Owner, x: number, y: number, r: number): Ent {
    const e: Ent = {
      id: this.nextId++, kind, owner, alive: true, x, y, px: x, py: y, r,
      hp: 1, maxHp: 1, damage: 0, attackTicks: sec(1), atkCd: 0, range: 0, sight: 0, speed: 0, targets: 'any', xpValue: 0,
      unit: null, hero: null, lane: 0, wp: 0, targetId: 0, deploy: 0, slow: 0, slowPct: 100,
      lastHitOwner: -1, lastHitId: 0, lastHitTick: 0,
      level: 1, heroXp: 0, respawn: 0, abilityCd: 0, ambushLeft: 0, hidden: false,
      order: NO_ORDER, prevOrder: NO_ORDER, goalX: x, goalY: y, camp: 0,
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
      hero: kind, hp: st.hp, maxHp: st.hp, damage: st.damage, attackTicks: st.attackTicks, atkCd: 0,
      range: st.range, sight: st.sight, speed: st.speed, targets: st.targets, xpValue: st.xp,
      abilityCd: idiv(st.abilityTicks, 2),
      order: { type: 'push', lane: laneId, camp: 0 } satisfies Order,
    });
    this.players[owner].heroIds[kind] = h.id;
    return h;
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

  // ---------- updates ----------

  private speedOf(e: Ent): number {
    if (e.slow > 0) { e.slow--; return pct(e.speed, e.slowPct); }
    return e.speed;
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

  private targetable(by: Ent, t: Ent): boolean {
    if (!t.alive || t.hp <= 0 || !this.isEnemy(by, t)) return false;
    if (t.kind === 'hero' && t.hidden) return false;
    if (t.kind === 'camp') return false;
    if (by.targets === 'buildings' && t.kind !== 'tower' && t.kind !== 'core') return false;
    return true;
  }

  /** Nearest enemy within `reach` of (cx, cy) (defaults to the entity itself). */
  private acquire(e: Ent, reach: number, cx = e.x, cy = e.y, filter?: (t: Ent) => boolean): Ent | null {
    let best: Ent | null = null;
    let bestD = Infinity;
    for (const t of this.ents) {
      if (!this.targetable(e, t) || (filter && !filter(t))) continue;
      const d = dist2(cx, cy, t.x, t.y);
      const r = reach + t.r;
      if (d <= r * r && d < bestD) { best = t; bestD = d; }
    }
    return best;
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

  /** Attack or close in on a target. Returns true if the entity is busy with it. */
  private engage(e: Ent, t: Ent, spd: number): void {
    if (this.inRange(e, t)) {
      if (e.atkCd <= 0) {
        let dmg = e.damage;
        if (e.kind === 'hero' && e.ambushLeft > 0) {
          dmg = pct(dmg, HERO_RULES.ambushPercent);
          e.ambushLeft = 0;
          this.events.push({ k: 'text', x: t.x, y: t.y - 120, text: 'Ambush!', tone: 'ambush' });
        }
        this.damage(t, dmg, e);
        e.atkCd = e.attackTicks;
        this.events.push({ k: 'hit', x1: e.x, y1: e.y, x2: t.x, y2: t.y, ranged: e.range > 300, owner: e.owner });
      }
    } else if (spd > 0) {
      this.moveTo(e, t.x, t.y, spd);
    }
  }

  private updateUnit(e: Ent): void {
    if (e.deploy > 0) { e.deploy--; return; }
    if (e.hp <= 0) return;
    if (e.atkCd > 0) e.atkCd--;
    const spd = this.speedOf(e);
    let t = this.currentTarget(e, e.sight + 200);
    if (!t || (this.tick + e.id) % 4 === 0) {
      const n = this.acquire(e, e.sight);
      if (n) { t = n; e.targetId = n.id; }
    }
    if (t) this.engage(e, t, spd);
    else this.followPath(e, spd);
  }

  private anchorFor(h: Ent): Pt {
    const p = h.owner as Player;
    const toRiver = p === 0 ? -1 : 1;
    if (h.order.type === 'defend') {
      const [x, y] = towerPos(LANES[h.order.lane], p);
      return [x, y + 250 * toRiver];
    }
    return [CORES[p][0], CORES[p][1] + 420 * toRiver];
  }

  private updateHero(h: Ent): void {
    const p = h.owner as Player;
    if (!h.alive) {
      if (h.respawn > 0) h.respawn--;
      if (h.respawn <= 0) this.respawnHero(h);
      return;
    }
    if (h.deploy > 0) { h.deploy--; return; }
    if (h.hp <= 0) return;
    if (h.atkCd > 0) h.atkCd--;
    if (h.abilityCd > 0) h.abilityCd--;
    const spd = this.speedOf(h);
    const st = HEROES[h.hero as HeroKind];
    const o = h.order;

    if (o.type === 'gank') {
      if (this.tick % 10 === 0) this.updateGankGoal(h);
      // Arrive at the goal, or as soon as the hero reaches the lane with an enemy in attack range.
      const atLane = laneDist2(LANES[o.lane], h.x, h.y) <= (LANE_HALF + 250) * (LANE_HALF + 250);
      const strike = atLane && this.acquire(h, h.range) !== null;
      if (strike || this.moveTo(h, h.goalX, h.goalY, spd) || within(h.x, h.y, h.goalX, h.goalY, HERO_RULES.gankArrive)) {
        h.order = { type: 'push', lane: o.lane, camp: 0 };
        this.setPathFrom(h, o.lane, nearestS(LANES[o.lane], h.x, h.y));
      }
      return;
    }

    if (o.type === 'farm') {
      const camp = this.camps()[o.camp];
      if (!camp || !camp.alive) { this.endFarm(h); return; }
      if (within(h.x, h.y, camp.x, camp.y, h.range + h.r + camp.r)) {
        if (h.atkCd <= 0) {
          this.damage(camp, h.damage, h);
          h.atkCd = h.attackTicks;
          this.events.push({ k: 'hit', x1: h.x, y1: h.y, x2: camp.x, y2: camp.y, ranged: h.range > 300, owner: p });
        }
      } else {
        this.moveTo(h, camp.x, camp.y, spd);
      }
      return;
    }

    this.tryAbility(h, st);

    if (o.type === 'push') {
      let t = this.currentTarget(h, h.sight + 200);
      if (!t || (this.tick + h.id) % 4 === 0) {
        const n = this.acquire(h, h.sight);
        if (n) { t = n; h.targetId = n.id; }
      }
      if (t) this.engage(h, t, spd);
      else this.followPath(h, spd);
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

  private tryAbility(h: Ent, st: (typeof HEROES)[HeroKind]): void {
    if (h.abilityCd > 0) return;
    const reach = st.abilityRange;
    const victims: { e: Ent; d: number }[] = [];
    for (const t of this.ents) {
      if (!this.targetable(h, t) || t.kind === 'tower' || t.kind === 'core') continue;
      const d = dist2(h.x, h.y, t.x, t.y);
      const r = reach + t.r;
      if (d <= r * r) victims.push({ e: t, d });
    }
    if (!victims.length) return;
    victims.sort((a, b) => a.d - b.d || a.e.id - b.e.id);
    const hit = st.abilityTargets > 0 ? victims.slice(0, st.abilityTargets) : victims;
    const dmg = pct(st.abilityDamage, 100 + XP.perLevelPercent * (h.level - 1));
    for (const v of hit) {
      this.damage(v.e, dmg, h);
      if (st.slowTicks > 0) { v.e.slow = st.slowTicks; v.e.slowPct = st.slowPercent; }
      this.events.push({ k: 'hit', x1: h.x, y1: h.y, x2: v.e.x, y2: v.e.y, ranged: true, owner: h.owner });
    }
    if (st.abilityTargets === 0) this.events.push({ k: 'boom', x: h.x, y: h.y, r: reach, owner: h.owner });
    this.events.push({ k: 'text', x: h.x, y: h.y - 140, text: st.abilityName, tone: 'info' });
    h.abilityCd = st.abilityTicks;
  }

  /** Where a ganking hero heads: the front of the fight in the target lane. */
  private updateGankGoal(h: Ent): void {
    const lane = LANES[h.order.lane];
    const p = h.owner as Player;
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
    const p = h.owner as Player;
    const st = HEROES[h.hero as HeroKind];
    const [x, y] = [CORES[p][0], CORES[p][1] + (p === 0 ? -420 : 420)];
    const scale = 100 + XP.perLevelPercent * (h.level - 1);
    Object.assign(h, { alive: true, x, y, px: x, py: y, maxHp: pct(st.hp, scale), targetId: 0, slow: 0, ambushLeft: 0, hidden: false });
    h.hp = h.maxHp;
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
      this.damage(t, c.damage, c);
      c.atkCd = c.attackTicks;
      this.events.push({ k: 'hit', x1: c.x, y1: c.y, x2: t.x, y2: t.y, ranged: false, owner: NEUTRAL });
    }
  }

  // ---------- damage, spells, deaths ----------

  private damage(t: Ent, amount: number, src: Ent | null, srcOwner: number = src ? src.owner : -1): void {
    let dmg = amount;
    if (t.kind === 'tower' && this.tick < MATCH.towerShieldUntil) dmg = pct(dmg, MATCH.towerShieldPercent);
    t.hp -= Math.max(1, dmg);
    t.lastHitOwner = srcOwner;
    t.lastHitId = src ? src.id : 0;
    t.lastHitTick = this.tick;
  }

  private firebolt(owner: Player, x: number, y: number): void {
    this.events.push({ k: 'boom', x, y, r: FIREBOLT.radius, owner });
    for (const t of this.ents) {
      if (!t.alive || t.hp <= 0 || t.owner === owner) continue;
      const r = FIREBOLT.radius + t.r;
      if (dist2(x, y, t.x, t.y) > r * r) continue;
      const dmg = t.kind === 'tower' || t.kind === 'core' ? pct(FIREBOLT.damage, FIREBOLT.structurePercent) : FIREBOLT.damage;
      this.damage(t, dmg, null, owner);
    }
  }

  private separate(): void {
    const movers = this.ents.filter((e) => e.alive && e.hp > 0 && (e.kind === 'unit' || e.kind === 'hero'));
    for (let i = 0; i < movers.length; i++) {
      const a = movers[i];
      for (let j = i + 1; j < movers.length; j++) {
        const b = movers[j];
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
      let hidden = inJungle(h.x, h.y, this.lanes);
      if (hidden) {
        for (const e of this.ents) {
          if (e.alive && e.hp > 0 && e.owner !== h.owner && e.owner !== NEUTRAL && within(h.x, h.y, e.x, e.y, HERO_RULES.revealRadius)) { hidden = false; break; }
        }
      }
      h.hidden = hidden;
      if (hidden) h.ambushLeft = HERO_RULES.ambushWindow;
      else if (h.ambushLeft > 0) h.ambushLeft--;
    }
  }

  private giveXp(h: Ent, amount: number): void {
    if (!h.alive || h.level >= XP.levels.length) { h.heroXp += amount; return; }
    h.heroXp += amount;
    while (h.level < XP.levels.length && h.heroXp >= XP.levels[h.level]) {
      h.level++;
      const st = HEROES[h.hero as HeroKind];
      const scale = 100 + XP.perLevelPercent * (h.level - 1);
      const newMax = pct(st.hp, scale);
      h.hp += newMax - h.maxHp;
      h.maxHp = newMax;
      h.damage = pct(st.damage, scale);
      this.events.push({ k: 'text', x: h.x, y: h.y - 150, text: `Level ${h.level}!`, tone: 'level' });
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
      switch (e.kind) {
        case 'unit':
          this.shareXp(e, e.xpValue);
          this.events.push({ k: 'death', x: e.x, y: e.y, owner: e.owner, big: false });
          break;
        case 'hero':
          this.shareXp(e, XP.hero);
          e.respawn = HERO_RULES.respawnBase + HERO_RULES.respawnPerLevel * e.level;
          e.targetId = 0;
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
          const killer = e.lastHitId ? this.get(e.lastHitId) : undefined;
          if (e.lastHitOwner === 0 || e.lastHitOwner === 1) {
            const pl = this.players[e.lastHitOwner];
            pl.mana = Math.min(MANA.max, pl.mana + CAMP.manaReward);
            this.events.push({ k: 'text', x: e.x, y: e.y - 120, text: '+2 mana', tone: 'mana' });
          }
          if (killer && killer.kind === 'hero') this.giveXp(killer, XP.camp);
          break;
        }
      }
    }
  }
}

export type { Lane };
