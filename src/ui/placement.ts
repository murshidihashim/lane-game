// Where a dragged card would land, and which hero orders the map offers.
// The UI may use fractions here; commands sent to the rules are always whole numbers.
import { CAMPS, CORES, LANES, type LaneId, laneDist2, nearestS, pointAt, towerPos } from '../game/map';
import { CARDS, DEPLOY, type CardId, type HeroKind } from '../game/rules';
import type { Command, Ent, OrderType, Sim } from '../game/sim';

export type Placement =
  | { kind: 'unit'; lane: LaneId; u: number; x: number; y: number }
  | { kind: 'spell'; x: number; y: number };

/** Snap a world point to a drop spot for the human player (player 0). */
export function placeCard(sim: Sim, card: CardId, wx: number, wy: number): Placement {
  if (CARDS[card].kind === 'spell') return { kind: 'spell', x: Math.round(wx), y: Math.round(wy) };
  let lane: LaneId = sim.lanes[0];
  let best = Infinity;
  for (const id of sim.lanes) {
    const d = laneDist2(LANES[id], Math.round(wx), Math.round(wy));
    if (d < best) { best = d; lane = id; }
  }
  const s = nearestS(LANES[lane], Math.round(wx), Math.round(wy));
  const u = Math.max(DEPLOY.minU, Math.min(sim.maxU(0, lane), s));
  const [x, y] = pointAt(LANES[lane], u);
  return { kind: 'unit', lane, u, x, y };
}

export function cardCommand(card: CardId, p: Placement): Command {
  return p.kind === 'spell'
    ? { t: 'spell', player: 0, card, x: p.x, y: p.y }
    : { t: 'card', player: 0, card, lane: p.lane, u: p.u };
}

export interface OrderTarget {
  x: number; y: number;
  order: OrderType;
  lane?: LaneId;
  camp?: number;
  label: string;
  /** Draw the label above the spot instead of below it. */
  labelAbove?: boolean;
}

/** Spots a hero can be dragged onto, with the order each one gives. */
export function orderTargets(sim: Sim, hero: Ent | undefined): OrderTarget[] {
  const out: OrderTarget[] = [];
  const current = hero ? sim.heroLane(hero) : -1;
  for (const id of sim.lanes) {
    const lane = LANES[id];
    const [x, y] = pointAt(lane, Math.round(lane.length / 2));
    const gank = hero !== undefined && hero.alive && current !== id;
    out.push({ x, y, order: gank ? 'gank' : 'push', lane: id, label: gank ? 'Gank' : 'Push' });
  }
  for (const id of sim.lanes) {
    const [x, y] = towerPos(LANES[id], 0);
    out.push({ x, y: y - 120, order: 'defend', lane: id, label: 'Defend', labelAbove: true });
  }
  CAMPS.forEach(([x, y], i) => out.push({ x, y, order: 'farm', camp: i, label: 'Farm' }));
  out.push({ x: CORES[0][0] + 520, y: CORES[0][1] + 40, order: 'retreat', label: 'Retreat' });
  return out;
}

export function orderCommand(hero: HeroKind, t: OrderTarget): Command {
  return { t: 'order', player: 0, hero, order: t.order, lane: t.lane, camp: t.camp };
}

export function orderLabel(h: Ent): string {
  const lane = (id: LaneId) => LANES[id].name;
  switch (h.order.type) {
    case 'push': return `Push ${lane(h.order.lane)}`;
    case 'gank': return `Gank → ${lane(h.order.lane)}`;
    case 'defend': return `Defend ${lane(h.order.lane)} tower`;
    case 'farm': return `Farm ${h.order.camp === 0 ? 'left' : 'right'} camp`;
    case 'retreat': return 'Retreat to Core';
  }
}
