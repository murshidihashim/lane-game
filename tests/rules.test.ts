// Core rules: mana, cards, drop zones, towers, winning. Plus the map's shape (DEC-003).
import { describe, expect, test } from 'vitest';
import { LANES, CENTER, rotate } from '../src/game/map';
import { isqrt } from '../src/game/math';
import { DEPLOY, MANA, MATCH, STRUCTURES } from '../src/game/rules';
import { Sim } from '../src/game/sim';
import { stepN } from './helpers';

describe('whole-number maths', () => {
  test('isqrt is exact', () => {
    for (const n of [0, 1, 2, 3, 4, 15, 16, 17, 99, 100, 101, 123456789, 48_000_000, 96_123_457]) {
      const r = isqrt(n);
      expect(r * r).toBeLessThanOrEqual(n);
      expect((r + 1) * (r + 1)).toBeGreaterThan(n);
    }
  });
});

describe('map', () => {
  test('the map is the same when turned upside down', () => {
    const [left, mid, right] = LANES;
    expect(left.pts.map(rotate).reverse()).toEqual(right.pts);
    expect(mid.pts.map(rotate).reverse()).toEqual(mid.pts);
    expect(rotate([CENTER.x, CENTER.y])).toEqual([CENTER.x, CENTER.y]);
  });

  test('the middle lane is at least 30% longer from the river to its tower (DEC-003)', () => {
    const riverToTower = (i: number) => LANES[i].length / 2 - LANES[i].towerS;
    expect(riverToTower(1)).toBeGreaterThan(riverToTower(0) * 1.3);
    expect(riverToTower(0)).toBe(riverToTower(2));
  });
});

describe('mana', () => {
  test('starts at 5, refills 1 every 2.8 s, caps at 10', () => {
    const sim = new Sim({ seed: 1, waves: false });
    expect(sim.players[0].mana).toBe(5 * MANA.perMana);
    stepN(sim, 56); // 2.8 s
    expect(sim.players[0].mana).toBe(6 * MANA.perMana);
    stepN(sim, 1000);
    expect(sim.players[0].mana).toBe(MANA.max);
  });

  test('refills twice as fast in the last minute', () => {
    const sim = new Sim({ seed: 1, waves: false });
    stepN(sim, MATCH.doubleManaFrom);
    sim.players[0].mana = 0;
    stepN(sim, 28);
    expect(sim.players[0].mana).toBe(MANA.perMana);
  });
});

describe('cards', () => {
  test('playing a card costs mana, spawns units in the drop zone and cycles the hand', () => {
    const sim = new Sim({ seed: 1, waves: false });
    sim.players[0].hand = ['spearmen', 'archers', 'imps', 'ram'];
    sim.players[0].next = 'firebolt';
    sim.players[0].queue = ['shieldbearer', 'rimba', 'benteng'];
    sim.players[0].mana = MANA.max;
    sim.submit({ t: 'card', player: 0, card: 'spearmen', lane: 0, u: 99999 }); // too far: gets clamped
    sim.step();
    const units = sim.ents.filter((e) => e.kind === 'unit' && e.owner === 0);
    expect(units).toHaveLength(3);
    expect(units.every((u) => u.deploy > 0)).toBe(true);
    const half = LANES[0].length / 2;
    for (const u of units) expect(u.y).toBeGreaterThan(3470); // still on our side of the river
    expect(sim.maxU(0, 0)).toBe(Math.trunc(half) - DEPLOY.riverGap);
    expect(sim.players[0].mana).toBe(MANA.max - 3 * MANA.perMana + MANA.regenPerTick);
    expect(sim.players[0].hand).toEqual(['firebolt', 'archers', 'imps', 'ram']);
    expect(sim.players[0].queue).toEqual(['rimba', 'benteng', 'spearmen']);
  });

  test('a card you cannot afford, or a lane that is not in play, is refused', () => {
    const sim = new Sim({ seed: 1, waves: false, lanes: 2 });
    sim.players[0].hand = ['ram', 'imps', 'archers', 'spearmen'];
    sim.players[0].mana = 4 * MANA.perMana;
    sim.submit({ t: 'card', player: 0, card: 'ram', lane: 0, u: 1000 }); // costs 5
    sim.submit({ t: 'card', player: 0, card: 'imps', lane: 1, u: 1000 }); // no middle lane
    sim.step();
    expect(sim.ents.filter((e) => e.kind === 'unit')).toHaveLength(0);
  });

  test('a played hero leaves the card cycle for good', () => {
    const sim = new Sim({ seed: 1, waves: false });
    sim.players[0].hand = ['rimba', 'archers', 'imps', 'ram'];
    sim.players[0].next = 'spearmen';
    sim.players[0].queue = ['benteng', 'firebolt', 'shieldbearer'];
    sim.players[0].mana = MANA.max;
    sim.submit({ t: 'card', player: 0, card: 'rimba', lane: 1, u: 1000 });
    sim.step();
    expect(sim.heroOf(0, 'rimba')).toBeDefined();
    const all = [...sim.players[0].hand, sim.players[0].next, ...sim.players[0].queue];
    expect(all).not.toContain('rimba');
    expect(all).toHaveLength(7);
  });
});

describe('towers and winning', () => {
  test('towers take half damage in the first minute', () => {
    const sim = new Sim({ seed: 1, waves: false });
    const t = sim.towerOf(1, 0)!;
    sim.players[0].hand = ['firebolt', 'archers', 'imps', 'ram'];
    sim.players[0].mana = MANA.max;
    sim.submit({ t: 'spell', player: 0, card: 'firebolt', x: t.x, y: t.y });
    stepN(sim, 20);
    expect(t.hp).toBe(STRUCTURES.tower.hp - 39); // 260 x 30% = 78, halved
    stepN(sim, MATCH.towerShieldUntil);
    const before = t.hp;
    sim.players[0].hand = ['firebolt', 'archers', 'imps', 'ram'];
    sim.players[0].mana = MANA.max;
    sim.submit({ t: 'spell', player: 0, card: 'firebolt', x: t.x, y: t.y });
    stepN(sim, 20);
    expect(t.hp).toBe(before - 78);
  });

  test('destroying an enemy tower moves your drop zone up that lane', () => {
    const sim = new Sim({ seed: 1, waves: false });
    const before = sim.maxU(0, 0);
    sim.towerOf(1, 0)!.hp = 0;
    sim.step();
    expect(sim.players[0].towersDestroyed).toBe(1);
    expect(sim.maxU(0, 0)).toBe(LANES[0].length - LANES[0].towerS);
    expect(sim.maxU(0, 0)).toBeGreaterThan(before);
    expect(sim.maxU(0, 2)).toBe(before);
  });

  test('destroying the enemy Core wins at once', () => {
    const sim = new Sim({ seed: 1, waves: false });
    sim.coreOf(1).hp = 0;
    sim.step();
    expect(sim.result).toEqual({ winner: 0, reason: 'core' });
  });

  test('at 5:00 more towers wins', () => {
    const sim = new Sim({ seed: 1, waves: false });
    stepN(sim, 100);
    sim.towerOf(0, 2)!.hp = 0;
    stepN(sim, MATCH.regulation);
    expect(sim.result).toEqual({ winner: 1, reason: 'towers' });
    expect(sim.tick).toBe(MATCH.regulation);
  });

  test('level at 5:00 goes to sudden death: next tower wins, otherwise a draw', () => {
    const a = new Sim({ seed: 1, waves: false });
    stepN(a, MATCH.regulation);
    expect(a.result).toBeNull();
    expect(a.phase()).toBe('sudden');
    a.towerOf(1, 1)!.hp = 0;
    a.step();
    expect(a.result).toEqual({ winner: 0, reason: 'sudden' });

    const b = new Sim({ seed: 1, waves: false });
    stepN(b, MATCH.regulation + MATCH.suddenDeath);
    expect(b.result).toEqual({ winner: null, reason: 'draw' });
  });
});
