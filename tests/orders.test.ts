// PLAN-001 T3, PLAN-004 T2: each hero order makes the hero do the right thing.
import { describe, expect, test } from 'vitest';
import { LANES, CORES, nearestS, pointAt, towerPos, uToS } from '../src/game/map';
import { HEROES, HERO_RULES, MANA, type HeroKind } from '../src/game/rules';
import { DRAFT_ORDER, type Ent, Sim, botDraftPick, randomPicks } from '../src/game/sim';
import { heroOnLane, parkHeroes, stepN } from './helpers';

/** A quiet match (no waves) with every hero waiting at home. */
function quiet(): Sim {
  const sim = new Sim({ seed: 3, waves: false });
  parkHeroes(sim, 0);
  parkHeroes(sim, 1);
  return sim;
}

/** Bring one of player 0's heroes (Rimba or Benteng) to a lane spot. */
function playHero(sim: Sim, hero: 'rimba' | 'benteng', lane: 0 | 1 | 2, u: number): Ent {
  const h = heroOnLane(sim, 0, hero, lane, u);
  stepN(sim, 22);
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
    expect(nearestS(LANES[0], h.x, h.y)).toBeGreaterThan(before + HEROES.rimba.speed * 70); // most of 100 ticks at walking speed
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
    // The opponent has Spearmen coming down the right lane.
    const [sx, sy] = pointAt(LANES[2], uToS(LANES[2], 1, 3400));
    for (const dx of [-110, 0, 110]) sim.summon(1, 'spearman', sx + dx, sy, 2);
    stepN(sim, 40);
    sim.submit({ t: 'order', player: 0, hero: 'rimba', order: 'gank', lane: 2 });
    let wasHidden = false;
    let hiddenFromEnemy = false;
    let ambush = false;
    for (let i = 0; i < 400 && !ambush; i++) {
      sim.step();
      if (h.hidden) wasHidden = true;
      if (!sim.sees(1, h)) hiddenFromEnemy = true;
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

  test('heroes start on the map: all three walk out from the Pusaka, one to each lane (DEC-011, DEC-014)', () => {
    const sim = new Sim({ seed: 3, picks: [['helang', 'ombak', 'benteng'], ['rimba', 'seri', 'kail']] });
    for (const p of [0, 1] as const) {
      const hs = sim.heroes(p);
      expect(hs).toHaveLength(3);
      for (const h of hs) expect(near(h, CORES[p][0], CORES[p][1], 700)).toBe(true);
    }
    expect(sim.heroOf(0, 'helang')!.order).toMatchObject({ type: 'push', lane: 0 });
    expect(sim.heroOf(0, 'ombak')!.order).toMatchObject({ type: 'push', lane: 1 });
    expect(sim.heroOf(0, 'benteng')!.order).toMatchObject({ type: HEROES.benteng.best, lane: 2 });
    stepN(sim, HERO_RULES.startDelay + 100);
    expect(near(sim.heroOf(0, 'helang')!, CORES[0][0], CORES[0][1], 700)).toBe(false);
  });

  test('move: a hero walks to any spot, holds it and fights what comes close', () => {
    const sim = quiet();
    const h = playHero(sim, 'rimba', 0, 1500);
    sim.submit({ t: 'order', player: 0, hero: 'rimba', order: 'move', x: 1950, y: 4600 });
    stepN(sim, 400);
    expect(h.order).toMatchObject({ type: 'move', x: 1950, y: 4600 });
    expect(near(h, 1950, 4600, 60)).toBe(true);
    const t = sim.summon(1, 'spearman', 1950, 4200, 1);
    t.speed = 0;
    stepN(sim, 120);
    expect(t.alive).toBe(false);
    stepN(sim, 200);
    expect(near(h, 1950, 4600, 60)).toBe(true); // back on its spot
    // a spot off the map is pulled back onto it
    sim.submit({ t: 'order', player: 0, hero: 'rimba', order: 'move', x: -5000, y: 99999 });
    sim.step();
    expect(h.order.x).toBeGreaterThanOrEqual(0);
    expect(h.order.y).toBeLessThan(99999);
  });

  test('three heroes a side, never the same hero on both sides; 2 lanes: the third joins the left lane', () => {
    const sim = new Sim({ seed: 3, lanes: 2, picks: [['helang', 'ombak', 'benteng'], ['helang', 'seri']] });
    const mine = sim.players[0].picks;
    const theirs = sim.players[1].picks;
    expect(mine).toEqual(['helang', 'ombak', 'benteng']);
    expect(theirs).toHaveLength(3);
    expect(theirs.some((k) => mine.includes(k))).toBe(false);
    expect(new Set(theirs).size).toBe(3);
    expect(sim.heroOf(0, 'helang')!.order.lane).toBe(0);
    expect(sim.heroOf(0, 'ombak')!.order.lane).toBe(2);
    expect(sim.heroOf(0, 'benteng')!.order.lane).toBe(0);
  });

  test('draft helpers: the bot never takes a taken hero, prefers a new job, and is repeatable', () => {
    const taken: HeroKind[] = [];
    const bot: HeroKind[] = [];
    const me: HeroKind[] = [];
    for (const side of DRAFT_ORDER) {
      if (side === 1) {
        const k = botDraftPick(77, taken, bot);
        expect(taken).not.toContain(k);
        expect(botDraftPick(77, taken, bot)).toBe(k);
        bot.push(k);
        taken.push(k);
      } else {
        const k = randomPicks(5, taken, 1)[0];
        me.push(k);
        taken.push(k);
      }
    }
    expect(bot).toHaveLength(3);
    expect(me).toHaveLength(3);
    expect(new Set(bot.map((k) => HEROES[k].best)).size).toBe(3); // three different jobs
  });
});
