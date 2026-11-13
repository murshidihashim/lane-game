// Which hero orders the map offers (DEC-009, DEC-011). A drop anywhere else is a Move order.
// The UI may use fractions here; commands sent to the rules are always whole numbers.
import { CORES, LANES, LANE_HALF, WARD_SPOTS, type LaneId, laneDist2, pointAt, towerPos } from '../game/map';
import { CALLS, HEROES, ULT_AIMS, UNITS, UPGRADES, type CallId, type HeroKind } from '../game/rules';
import type { Command, Ent, OrderType, Sim } from '../game/sim';
import { type Layout, inField, toScreen, toWorld } from './layout';

export interface OrderTarget {
  x: number; y: number;
  order: OrderType;
  lane?: LaneId;
  camp?: number; // index into Sim.camps() (groves, dens, boss)
  target?: number; // entity id (relics)
  spot?: number; // ward spot
  label: string;
  icon: string;
}

/** Spots a hero can be dragged onto, with the order each one gives (DEC-009). */
export function orderTargets(sim: Sim, hero: Ent | undefined): OrderTarget[] {
  const out: OrderTarget[] = [];
  const current = hero ? sim.heroLane(hero) : -1;
  for (const id of sim.lanes) {
    const lane = LANES[id];
    const [x, y] = pointAt(lane, Math.round(lane.length / 2));
    const gank = hero !== undefined && hero.alive && current !== id;
    out.push({ x, y, order: gank ? 'gank' : 'push', lane: id, label: gank ? 'Gank' : 'Push tower', icon: gank ? '⤳' : '↑' });
  }
  for (const id of sim.lanes) {
    const [x, y] = towerPos(LANES[id], 0);
    out.push({ x, y: y - 120, order: 'defend', lane: id, label: 'Defend', icon: '⛨' });
  }
  sim.camps().forEach((c, i) => {
    if (c.campKind === 'boss' && !c.alive) return;
    out.push({ x: c.x, y: c.y, order: 'farm', camp: i, label: c.campKind === 'boss' ? 'Hunt Gajah Mina' : c.campKind === 'den' ? 'Farm den' : 'Farm grove', icon: c.campKind === 'boss' ? '☠' : '✦' });
  });
  for (const r of sim.relics()) out.push({ x: r.x, y: r.y, order: 'farm', target: r.id, label: 'Collect relic', icon: '◆' });
  WARD_SPOTS.forEach(([x, y], i) => out.push({ x, y, order: 'ward', spot: i, label: 'Ward', icon: '◉' }));
  out.push({ x: CORES[0][0] + 520, y: CORES[0][1] + 40, order: 'retreat', label: 'Retreat', icon: '⌂' });
  return out;
}

/** Move order: walk to a spot and hold it. */
export function moveCommand(hero: HeroKind, wx: number, wy: number): Command {
  return { t: 'order', player: 0, hero, order: 'move', x: Math.round(wx), y: Math.round(wy) };
}

export function orderLabel(h: Ent, sim?: Sim): string {
  const lane = (id: LaneId) => LANES[id].name;
  switch (h.order.type) {
    case 'push': return `Push ${lane(h.order.lane)}`;
    case 'gank': return `Gank → ${lane(h.order.lane)}`;
    case 'defend': return `Defend ${lane(h.order.lane)} tower`;
    case 'farm': {
      const t = sim?.get(h.order.camp);
      if (t?.kind === 'relic') return 'Collect relic';
      if (t?.campKind === 'boss') return 'Hunt Gajah Mina';
      return t?.campKind === 'den' ? 'Farm den' : 'Farm grove';
    }
    case 'ward': return 'Place ward';
    case 'retreat': return 'Retreat to Pusaka';
    case 'move': return 'Hold a spot';
    case 'attack': {
      const t = sim?.get(h.order.target);
      const name = t?.hero ? HEROES[t.hero].name : t?.unit ? UNITS[t.unit].name : t?.kind === 'tower' ? 'tower' : t?.kind === 'core' ? 'Pusaka' : t?.kind === 'ward' ? 'ward' : 'enemy';
      return `Attack ${name}`;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Hero orders (DEC-017, DEC-021): choose an order on the ring, then tap (or let go on) a highlighted target.

export type CommandAction = 'move' | 'attack' | 'push' | 'gank' | 'defend' | 'farm' | 'ward' | 'retreat';

export const COMMAND_ORDERS: readonly { id: CommandAction; label: string; icon: string; hint: string }[] = [
  { id: 'move', label: 'Move', icon: '⚑', hint: 'Tap where to go and hold' },
  { id: 'attack', label: 'Attack', icon: '⚔', hint: 'Tap an enemy to go after' },
  { id: 'push', label: 'Push', icon: '↑', hint: 'Tap a lane to push' },
  { id: 'gank', label: 'Gank', icon: '⤳', hint: 'Tap a lane to ambush' },
  { id: 'defend', label: 'Defend', icon: '⛨', hint: 'Tap one of your towers' },
  { id: 'farm', label: 'Farm', icon: '✦', hint: 'Tap a camp or a relic' },
  { id: 'ward', label: 'Ward', icon: '◉', hint: 'Tap a stone cairn' },
  { id: 'retreat', label: 'Retreat', icon: '⌂', hint: '' },
];

/** A spot an order can be aimed at, with the command it gives. ent: the entity, for Attack rings. */
export interface CommandTarget { x: number; y: number; cmd: Command; label: string; ent?: Ent }

/** Everything an order can be aimed at right now (what the map highlights). Move takes any spot. */
export function commandTargets(sim: Sim, kind: HeroKind, action: CommandAction): CommandTarget[] {
  const h = sim.heroOf(0, kind);
  const order = (o: Omit<Extract<Command, { t: 'order' }>, 't' | 'player' | 'hero'>): Command => ({ t: 'order', player: 0, hero: kind, ...o });
  const out: CommandTarget[] = [];
  switch (action) {
    case 'push': case 'gank':
      for (const id of sim.lanes) {
        const lane = LANES[id];
        const [x, y] = pointAt(lane, Math.round(lane.length / 2));
        out.push({ x, y, cmd: order({ order: action, lane: id }), label: `${action === 'push' ? 'Push' : 'Gank'} ${lane.name}` });
      }
      break;
    case 'defend':
      for (const id of sim.lanes) {
        const t = sim.towerOf(0, id);
        if (t && t.alive) out.push({ x: t.x, y: t.y, cmd: order({ order: 'defend', lane: id }), label: `Defend ${LANES[id].name}`, ent: t });
      }
      break;
    case 'farm':
      sim.camps().forEach((c, i) => {
        if (!c.alive) return;
        out.push({ x: c.x, y: c.y, cmd: order({ order: 'farm', camp: i }), label: c.campKind === 'boss' ? 'Hunt Gajah Mina' : c.campKind === 'den' ? 'Farm den' : 'Farm grove', ent: c });
      });
      for (const r of sim.relics()) out.push({ x: r.x, y: r.y, cmd: order({ order: 'farm', target: r.id }), label: 'Collect relic', ent: r });
      break;
    case 'ward':
      WARD_SPOTS.forEach(([x, y], i) => out.push({ x, y, cmd: order({ order: 'ward', spot: i }), label: 'Ward' }));
      break;
    case 'attack':
      if (!h) break;
      for (const e of sim.ents) {
        if (e.kind === 'camp' ? !e.alive || h.targets !== 'any' : !sim.canAttack(h, e)) continue;
        out.push({ x: e.x, y: e.y, cmd: order({ order: 'attack', target: e.id }), label: e.kind === 'camp' ? 'Farm' : 'Attack', ent: e });
      }
      break;
    case 'move': case 'retreat':
      break;
  }
  return out;
}

/** The order a tap at (sx, sy) gives for the chosen action, or null if nothing valid is there. */
export function resolveCommand(l: Layout, sim: Sim, kind: HeroKind, action: CommandAction, sx: number, sy: number): Command | null {
  if (!inField(l, sx, sy)) return null;
  const [wx, wy] = toWorld(l, sx, sy);
  if (action === 'move') return moveCommand(kind, wx, wy);
  if (action === 'retreat') return { t: 'order', player: 0, hero: kind, order: 'retreat' };
  if (action === 'push' || action === 'gank') {
    // anywhere on a lane picks that lane
    let best: LaneId | null = null;
    let bestD = (LANE_HALF + 250) * (LANE_HALF + 250);
    for (const id of sim.lanes) {
      const d = laneDist2(LANES[id], Math.round(wx), Math.round(wy));
      if (d < bestD) { bestD = d; best = id; }
    }
    return best === null ? null : { t: 'order', player: 0, hero: kind, order: action, lane: best };
  }
  // the nearest highlighted target within a finger's width
  let pick: CommandTarget | null = null;
  let bestD = 46 * 46;
  for (const t of commandTargets(sim, kind, action)) {
    const [x, y] = toScreen(l, t.x, t.y);
    const lift = t.ent && (t.ent.kind === 'unit' || t.ent.kind === 'hero') ? 12 : 0; // aim at the body, not the feet
    const d = (x - sx) * (x - sx) + (y - lift - sy) * (y - lift - sy);
    if (d < bestD) { bestD = d; pick = t; }
  }
  return pick ? pick.cmd : null;
}

// ---------- PLAN-015: aiming an ultimate, and commander calls (DEC-024) ----------

/** What letting go at a screen point would aim at: the snapped world point, the target, and the command or why not. */
export interface AimResult { x: number; y: number; ent?: Ent; cmd: Command | null; why: string }

/** Pieces an aimed ultimate can target (an enemy you can see, or one of your towers), for highlighting. */
export function ultAimTargets(sim: Sim, kind: HeroKind): Ent[] {
  const aim = ULT_AIMS[kind];
  const h = sim.heroOf(0, kind);
  if (!aim || !h) return [];
  if (aim.kind === 'tower') return sim.ents.filter((e) => e.alive && e.owner === 0 && (e.kind === 'tower' || e.kind === 'core'));
  if (aim.kind !== 'enemy' && aim.kind !== 'hero' && aim.kind !== 'troop') return [];
  return sim.ents.filter((e) => e.alive && e.hp > 0 && e.owner === 1 && sim.sees(0, e)
    && (aim.kind === 'hero' ? e.kind === 'hero' : aim.kind === 'troop' ? e.kind === 'unit' : e.kind === 'hero' || e.kind === 'unit'));
}

/** Aim one of your hero's ultimates at a screen point (ULT_AIMS). */
export function ultAimAt(l: Layout, sim: Sim, kind: HeroKind, sx: number, sy: number): AimResult {
  const aim = ULT_AIMS[kind];
  const h = sim.heroOf(0, kind);
  const [wx, wy] = toWorld(l, sx, sy);
  const none = (why: string): AimResult => ({ x: wx, y: wy, cmd: null, why });
  if (!aim || !h || !h.alive) return none('Not now');
  if (!inField(l, sx, sy)) return none('Let go on the map to aim');
  const reach = (x: number, y: number, extra = 0) => aim.range === 0 || Math.hypot(x - h.x, y - h.y) <= aim.range + extra;
  switch (aim.kind) {
    case 'enemy': case 'hero': case 'troop': case 'tower': {
      let best: Ent | undefined;
      let bestD = 42 * 42;
      for (const e of ultAimTargets(sim, kind)) {
        const [x, y] = toScreen(l, e.x, e.y);
        const d = (x - sx) ** 2 + (y - 10 - sy) ** 2;
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) return none(aim.kind === 'tower' ? 'Let go on one of your towers' : aim.kind === 'hero' ? 'Let go on an enemy hero' : aim.kind === 'troop' ? 'Let go on an enemy troop' : 'Let go on an enemy');
      if (aim.kind !== 'tower' && !reach(best.x, best.y, best.r)) return { x: best.x, y: best.y, ent: best, cmd: null, why: 'Out of reach' };
      return { x: best.x, y: best.y, ent: best, cmd: { t: 'ult', player: 0, hero: kind, target: best.id }, why: '' };
    }
    case 'spot': {
      let [x, y] = [wx, wy];
      const d = Math.hypot(x - h.x, y - h.y);
      if (aim.range > 0 && d > aim.range) { x = h.x + ((x - h.x) * aim.range) / d; y = h.y + ((y - h.y) * aim.range) / d; } // as far as it reaches
      x = Math.round(x);
      y = Math.round(y);
      return { x, y, cmd: { t: 'ult', player: 0, hero: kind, x, y }, why: '' };
    }
    case 'lane': {
      if (sim.laneAt(Math.round(wx), Math.round(wy), 300) === null) return none('Let go on a lane');
      return { x: wx, y: wy, cmd: { t: 'ult', player: 0, hero: kind, x: Math.round(wx), y: Math.round(wy) }, why: '' };
    }
  }
}

/** Aim a commander call at a screen point (CALLS[call].aim). */
export function callAimAt(l: Layout, sim: Sim, call: CallId, sx: number, sy: number): AimResult {
  const def = CALLS[call];
  const [wx, wy] = toWorld(l, sx, sy);
  const x = Math.round(wx);
  const y = Math.round(wy);
  const none = (why: string): AimResult => ({ x, y, cmd: null, why });
  if (!inField(l, sx, sy)) return none('Let go on the map');
  switch (def.aim) {
    case 'none': return { x, y, cmd: { t: 'call', player: 0, call }, why: '' };
    case 'spot': return { x, y, cmd: { t: 'call', player: 0, call, x, y }, why: '' };
    case 'seen':
      if (!sim.seesPoint(0, x, y)) return none('Only where you can see');
      return { x, y, cmd: { t: 'call', player: 0, call, x, y }, why: '' };
    case 'lane':
      if (sim.laneAt(x, y) === null) return none('Put it on a lane');
      if (!sim.seesPoint(0, x, y)) return none('Only where you can see');
      return { x, y, cmd: { t: 'call', player: 0, call, x, y }, why: '' };
    case 'tower': {
      let best: Ent | undefined;
      let bestD = 46 * 46;
      for (const e of sim.ents) {
        if (!e.alive || e.owner !== 0 || (e.kind !== 'tower' && e.kind !== 'core')) continue;
        const [ex, ey] = toScreen(l, e.x, e.y);
        const d = (ex - sx) ** 2 + (ey - sy) ** 2;
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) return none('Tap one of your towers');
      if (best.hp >= best.maxHp) return { x: best.x, y: best.y, ent: best, cmd: null, why: 'That tower is not hurt' };
      return { x: best.x, y: best.y, ent: best, cmd: { t: 'call', player: 0, call, target: best.id }, why: '' };
    }
  }
}

/** The hero's own upgrade text for a level-up choice: the "Lv 2: ..." or "Lv 3: ..." part of its Power text. */
export function upgradeTexts(kind: HeroKind, h: Ent, level: 2 | 3): [string, string] {
  const text = HEROES[kind].power.text;
  const lv2 = /Lv 2: ([^]*?)(?: Lv 3:|$)/.exec(text)?.[1]?.trim() ?? 'stronger';
  const lv3 = /Lv 3: ([^]*)$/.exec(text)?.[1]?.trim() ?? 'stronger';
  // with Quick taken at level 2, the level-3 own upgrade is the one level 2 would have given
  const own = level === 2 || h.upg[0] === 1 ? lv2 : lv3;
  const general = level === 2 ? `Quick: the Power comes back ${100 - UPGRADES.quickPct}% sooner` : `Strong: the Power does ${UPGRADES.strongPct - 100}% more`;
  return [`${HEROES[kind].power.name}: ${own}`, general];
}
