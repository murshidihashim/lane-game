// PLAN-007 T1-T3: heroes don't stall, think a little for themselves, and follow the Attack order (DEC-017).
import { describe, expect, test } from 'vitest';
import { CORES, LANES, pointAt, uToS } from '../src/game/map';
import { HERO_RULES, UNITS, type HeroKind } from '../src/game/rules';
import { type Ent, Sim } from '../src/game/sim';
import { heroOnLane, parkHeroes, stepN } from './helpers';

const MID = LANES[1];
const LEFT = LANES[0];

function quiet(mine: HeroKind[] = ['helang', 'benteng', 'kail'], theirs: HeroKind[] = ['rimba', 'seri', 'tedung']): Sim {
  const sim = new Sim({ seed: 9, waves: false, picks: [mine, theirs] });
  parkHeroes(sim, 0);
  parkHeroes(sim, 1);
  return sim;
}

const at = (lane: typeof MID, p: 0 | 1, u: number) => pointAt(lane, uToS(lane, p, u));
const near = (e: Ent, x: number, y: number, r: number) => Math.hypot(e.x - x, e.y - y) <= r;

/** Step until the condition holds (or the limit runs out); returns the ticks it took. */
function until(sim: Sim, ok: () => boolean, limit = 1200): number {
  for (let i = 0; i < limit; i++) { if (ok()) return i; sim.step(); }
  return limit;
}

describe('no stalls', () => {
  test('a hero walks through its own troops marching the other way', () => {
    const sim = quiet();
    const h = heroOnLane(sim, 0, 'helang', 1, 4200);
    h.deploy = 0;
    for (let i = 0; i < 6; i++) {
      const [x, y] = at(MID, 0, 3000 + i * 120);
      sim.summon(0, 'shieldbearer', x + (i % 2 ? 40 : -40), y, 1); // a column of tanks walking up the lane
    }
    const [gx, gy] = at(MID, 0, 2600);
    sim.submit({ t: 'order', player: 0, hero: 'helang', order: 'move', x: gx, y: gy });
    expect(until(sim, () => near(h, gx, gy, 60), 900)).toBeLessThan(900);
  });

  test('two heroes walking straight at each other pass instead of locking up', () => {
    const sim = quiet();
    const a = heroOnLane(sim, 0, 'helang', 1, 3000);
    const b = heroOnLane(sim, 0, 'kail', 1, 3000);
    a.deploy = 0; b.deploy = 0;
    sim.place(a, 1950, 4400);
    sim.place(b, 1950, 4900);
    sim.submit({ t: 'order', player: 0, hero: 'helang', order: 'move', x: 1950, y: 5000 });
    sim.submit({ t: 'order', player: 0, hero: 'kail', order: 'move', x: 1950, y: 4300 });
    until(sim, () => near(a, 1950, 5000, 60) && near(b, 1950, 4300, 60), 600);
    expect(near(a, 1950, 5000, 60)).toBe(true);
    expect(near(b, 1950, 4300, 60)).toBe(true);
  });
});

describe('smarter heroes', () => {
  test('a pushing hero waits outside an enemy tower until its own troops get there', () => {
    const sim = quiet();
    const h = heroOnLane(sim, 0, 'helang', 0, 3400);
    h.deploy = 0;
    h.powerCd = 9999;
    const tower = sim.towerOf(1, 0)!;
    const reach = tower.range + tower.r + h.r;
    stepN(sim, 500);
    expect(h.alive).toBe(true);
    expect(h.waiting).toBe(true);
    expect(near(h, tower.x, tower.y, reach)).toBe(false);
    expect(h.hp).toBe(h.maxHp); // never got shot
    // our troops arrive and take the tower's attention: the hero joins in
    for (let i = 0; i < 3; i++) {
      const [x, y] = at(LEFT, 1, LEFT.towerS + 100 + i * 40);
      const u = sim.summon(0, 'shieldbearer', x, y, 0);
      u.speed = 0;
    }
    const hp = tower.hp;
    until(sim, () => tower.hp < hp - 200, 600);
    expect(tower.hp).toBeLessThan(hp - 200);
    expect(h.waiting).toBe(false);
  });

  test('a badly hurt pushing hero falls back home, heals, and goes back to its lane', () => {
    const sim = quiet();
    const h = heroOnLane(sim, 0, 'benteng', 0, 3000);
    h.deploy = 0;
    h.hp = Math.trunc((h.maxHp * (HERO_RULES.fallbackBelowPct - 5)) / 100);
    sim.step();
    expect(h.fallback).toBe(true);
    const home: [number, number] = [CORES[0][0], CORES[0][1] - 420];
    until(sim, () => near(h, home[0], home[1], 300), 1200);
    expect(near(h, home[0], home[1], 300)).toBe(true);
    until(sim, () => !h.fallback, 1200);
    expect(h.hp * 100).toBeGreaterThanOrEqual(h.maxHp * HERO_RULES.fallbackUntilPct);
    expect(h.order.type).toBe('push');
    const y = h.y;
    stepN(sim, 60);
    expect(h.y).toBeLessThan(y); // walking back up to its lane
  });

  test('in reach of an enemy hero and a nearer troop, a hero goes for the hero', () => {
    const sim = quiet(['helang', 'benteng', 'kail'], ['rimba', 'seri', 'tedung']);
    const h = heroOnLane(sim, 0, 'helang', 0, 3000);
    h.deploy = 0;
    h.powerCd = 9999;
    const troop = sim.summon(1, 'spearman', h.x, h.y - 250, 0);
    troop.speed = 0;
    const foe = heroOnLane(sim, 1, 'seri', 0, 3000);
    foe.deploy = 0;
    foe.powerCd = 9999;
    sim.place(foe, h.x, h.y - 550);
    foe.speed = 0;
    stepN(sim, 6);
    expect(h.targetId).toBe(foe.id);
    expect(troop.hp).toBe(UNITS.spearman.hp);
  });
});

describe('Attack order', () => {
  test('goes after a chosen visible enemy, then back to its job', () => {
    const sim = quiet();
    const h = heroOnLane(sim, 0, 'helang', 0, 2600);
    h.deploy = 0;
    h.powerCd = 9999;
    const [x, y] = at(LEFT, 0, 3300);
    const t = sim.summon(1, 'archer', x + 250, y, 0);
    t.speed = 0;
    t.hp = 60;
    expect(sim.sees(0, t)).toBe(true);
    sim.submit({ t: 'order', player: 0, hero: 'helang', order: 'attack', target: t.id });
    sim.step();
    expect(h.order.type).toBe('attack');
    until(sim, () => !t.alive, 400);
    expect(t.alive).toBe(false);
    sim.step();
    expect(h.order.type).toBe('push'); // back to its job
  });

  test('refuses an enemy it cannot see or cannot hit; a neutral camp means Farm', () => {
    const sim = quiet(['gergasi', 'benteng', 'kail']);
    const h = heroOnLane(sim, 0, 'gergasi', 0, 2600);
    h.deploy = 0;
    const far = sim.summon(1, 'spearman', 3300, 1500, 2); // deep in the fog
    expect(sim.sees(0, far)).toBe(false);
    sim.submit({ t: 'order', player: 0, hero: 'gergasi', order: 'attack', target: far.id });
    sim.step();
    expect(h.order.type).toBe('push');
    const close = sim.summon(1, 'spearman', h.x, h.y - 300, 0); // visible, but Gergasi only hits buildings
    sim.submit({ t: 'order', player: 0, hero: 'gergasi', order: 'attack', target: close.id });
    sim.step();
    expect(h.order.type).toBe('push');
    const k = heroOnLane(sim, 0, 'kail', 0, 2600);
    k.deploy = 0;
    sim.submit({ t: 'order', player: 0, hero: 'kail', order: 'attack', target: sim.camps()[0].id });
    sim.step();
    expect(k.order).toMatchObject({ type: 'farm', camp: sim.camps()[0].id });
  });

  test('stops chasing when the enemy disappears into the fog', () => {
    const sim = quiet();
    const h = heroOnLane(sim, 0, 'helang', 0, 2600);
    h.deploy = 0;
    h.powerCd = 9999;
    const t = sim.summon(1, 'shieldbearer', h.x + 300, h.y - 700, 0);
    t.speed = 0;
    sim.submit({ t: 'order', player: 0, hero: 'helang', order: 'attack', target: t.id });
    sim.step();
    expect(h.order.type).toBe('attack');
    sim.place(t, 3300, 1500); // gone into the fog
    sim.step();
    sim.step();
    expect(h.order.type).toBe('push');
  });
});
