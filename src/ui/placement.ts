// Which hero orders the map offers (DEC-009, DEC-011). A drop anywhere else is a Move order.
// The UI may use fractions here; commands sent to the rules are always whole numbers.
import { CORES, LANES, LANE_HALF, WARD_SPOTS, type LaneId, laneDist2, pointAt, towerPos } from '../game/map';
import { HEROES, UNITS, type HeroKind } from '../game/rules';
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

export function orderCommand(hero: HeroKind, t: OrderTarget): Command {
  return { t: 'order', player: 0, hero, order: t.order, lane: t.lane, camp: t.camp, target: t.target, spot: t.spot };
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
// The command menu (DEC-017): tap a hero, pick an order, tap a highlighted target.

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
