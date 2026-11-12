// Where a dragged card would land, and which hero orders the map offers.
// The UI may use fractions here; commands sent to the rules are always whole numbers.
import { CORES, LANES, WARD_SPOTS, type LaneId, laneDist2, nearestS, pointAt, towerPos } from '../game/map';
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
  }
}
