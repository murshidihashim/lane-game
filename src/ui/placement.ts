// Which hero orders the map offers (DEC-009, DEC-011). A drop anywhere else is a Move order.
// The UI may use fractions here; commands sent to the rules are always whole numbers.
import { CORES, LANES, WARD_SPOTS, type LaneId, pointAt, towerPos } from '../game/map';
import type { HeroKind } from '../game/rules';
import type { Command, Ent, OrderType, Sim } from '../game/sim';

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
  }
}
