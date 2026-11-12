// PLAN-001 T3: each of the five hero orders makes the hero do the right thing.
import { describe, expect, test } from 'vitest';
import { LANES, CORES, nearestS, towerPos } from '../src/game/map';
import { MANA } from '../src/game/rules';
import { type Ent, Sim } from '../src/game/sim';
import { stepN } from './helpers';

/** A quiet match (no minion waves) where player 0 holds both hero cards and full mana. */
function quiet(): Sim {
  const sim = new Sim({ seed: 3, waves: false });
  sim.players[0].hand = ['rimba', 'benteng', 'spearmen', 'imps'];
  sim.players[0].mana = MANA.max;
  return sim;
}

function playHero(sim: Sim, hero: 'rimba' | 'benteng', lane: 0 | 1 | 2, u: number): Ent {
  sim.players[0].mana = MANA.max;
  sim.submit({ t: 'card', player: 0, card: hero, lane, u });
  sim.step();
  const h = sim.heroOf(0, hero);
  if (!h) throw new Error('hero not played');
  stepN(sim, 21); // deploy time
  return h;
}

const near = (e: Ent, x: number, y: number, r: number) => (e.x - x) ** 2 + (e.y - y) ** 2 <= r * r;

describe('hero orders', () => {
  test('push: a hero walks up its lane towards the enemy', () => {
    const sim = quiet();
    const h = playHero(sim, 'rimba', 0, 1500);
    const before = nearestS(LANES[0], h.x, h.y);
    stepN(sim, 100);
    expect(h.order.type).toBe('push');
    expect(nearestS(LANES[0], h.x, h.y)).toBeGreaterThan(before + 800);
  });

  test('defend: a hero goes to the chosen tower and stays there', () => {
    const sim = quiet();
    const h = playHero(sim, 'benteng', 0, 2500);
    sim.submit({ t: 'order', player: 0, hero: 'benteng', order: 'defend', lane: 1 });
    stepN(sim, 450);
    const [tx, ty] = towerPos(LANES[1], 0);
    expect(h.order).toMatchObject({ type: 'defend', lane: 1 });
    expect(near(h, tx, ty - 250, 120)).toBe(true);
    stepN(sim, 200);
    expect(near(h, tx, ty - 250, 120)).toBe(true);
  });

  test('gank: a hero crosses the jungle hidden, ambushes, then pushes the new lane', () => {
    const sim = quiet();
    const h = playHero(sim, 'rimba', 1, 2300);
    // The opponent sends Spearmen down the right lane.
    sim.players[1].hand = ['spearmen', 'archers', 'imps', 'ram'];
    sim.players[1].mana = MANA.max;
    sim.submit({ t: 'card', player: 1, card: 'spearmen', lane: 2, u: 3400 });
    stepN(sim, 40);
    sim.submit({ t: 'order', player: 0, hero: 'rimba', order: 'gank', lane: 2 });
    let wasHidden = false;
    let hiddenFromEnemy = false;
    let ambush = false;
    for (let i = 0; i < 400 && !ambush; i++) {
      sim.step();
      if (h.hidden) wasHidden = true;
      if (!sim.visibleTo(h, 1)) hiddenFromEnemy = true;
      if (sim.events.some((e) => e.k === 'text' && e.text === 'Ambush!')) ambush = true;
    }
    expect(wasHidden).toBe(true);
    expect(hiddenFromEnemy).toBe(true);
    expect(ambush).toBe(true);
    expect(h.order).toMatchObject({ type: 'push', lane: 2 });
  });

  test('gank onto the lane the hero is already in is just a push', () => {
    const sim = quiet();
    const h = playHero(sim, 'rimba', 0, 2000);
    sim.submit({ t: 'order', player: 0, hero: 'rimba', order: 'gank', lane: 0 });
    sim.step();
    expect(h.order).toMatchObject({ type: 'push', lane: 0 });
  });

  test('farm: a hero clears a camp, its owner gets 2 mana, then it returns to its old order', () => {
    const sim = quiet();
    const h = playHero(sim, 'benteng', 0, 2600);
    sim.submit({ t: 'order', player: 0, hero: 'benteng', order: 'farm', camp: 0 });
    sim.step();
    sim.players[0].mana = 0;
    const camp = sim.camps()[0];
    let jump = 0;
    for (let i = 0; i < 900 && camp.alive; i++) {
      sim.players[0].mana = 0; // keep well below the cap so the reward is measurable
      const before = sim.players[0].mana;
      sim.step();
      if (!camp.alive) jump = sim.players[0].mana - before;
    }
    expect(camp.alive).toBe(false);
    expect(jump).toBe(2 * MANA.perMana + MANA.regenPerTick);
    expect(h.heroXp).toBeGreaterThanOrEqual(60);
    sim.step(); // the hero notices the empty camp on its next update
    expect(h.order).toMatchObject({ type: 'push', lane: 0 });
  });

  test('retreat: a hurt hero walks home and heals', () => {
    const sim = quiet();
    const h = playHero(sim, 'rimba', 1, 2500);
    h.hp = 200;
    sim.submit({ t: 'order', player: 0, hero: 'rimba', order: 'retreat' });
    stepN(sim, 500);
    expect(h.order.type).toBe('retreat');
    expect(near(h, CORES[0][0], CORES[0][1], 600)).toBe(true);
    expect(h.hp).toBeGreaterThan(500);
  });

  test('an order is kept through death and respawn', () => {
    const sim = quiet();
    const h = playHero(sim, 'benteng', 0, 2000);
    sim.submit({ t: 'order', player: 0, hero: 'benteng', order: 'defend', lane: 2 });
    sim.step();
    h.hp = 0;
    sim.step();
    expect(h.alive).toBe(false);
    expect(h.respawn).toBeGreaterThan(0);
    stepN(sim, h.respawn + 2);
    expect(h.alive).toBe(true);
    expect(h.order).toMatchObject({ type: 'defend', lane: 2 });
  });
});
