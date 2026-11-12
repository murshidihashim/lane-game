// PLAN-001 T5: the 2-lane / 3-lane switch (2 lanes = the two side lanes).
import { describe, expect, test } from 'vitest';
import { Sim } from '../src/game/sim';
import { orderTargets } from '../src/ui/placement';
import { botMatch } from './helpers';

describe('lane switch', () => {
  test('3 lanes: left, middle and right, with 3 towers a side', () => {
    const sim = new Sim({ seed: 1, lanes: 3 });
    expect(sim.lanes).toEqual([0, 1, 2]);
    for (const p of [0, 1] as const) expect(sim.ents.filter((e) => e.kind === 'tower' && e.owner === p)).toHaveLength(3);
    expect(orderTargets(sim, undefined).filter((t) => t.order === 'push')).toHaveLength(3);
  });

  test('2 lanes: only the side lanes, with 2 towers a side', () => {
    const sim = new Sim({ seed: 1, lanes: 2 });
    expect(sim.lanes).toEqual([0, 2]);
    for (const p of [0, 1] as const) {
      const towers = sim.ents.filter((e) => e.kind === 'tower' && e.owner === p);
      expect(towers.map((t) => t.lane)).toEqual([0, 2]);
    }
    expect(orderTargets(sim, undefined).filter((t) => t.order === 'push' || t.order === 'defend').map((t) => t.lane)).toEqual([0, 2, 0, 2]);
  });

  test('minion waves only use the lanes in play', () => {
    const sim = new Sim({ seed: 1, lanes: 2 });
    for (let i = 0; i < 120; i++) sim.step();
    const lanes = new Set(sim.ents.filter((e) => e.kind === 'unit').map((e) => e.lane));
    expect([...lanes].sort()).toEqual([0, 2]);
  });

  test('a full 2-lane bot match finishes', () => {
    const { sim } = botMatch(11, 2);
    expect(sim.result).not.toBeNull();
    expect(sim.ents.some((e) => e.kind === 'unit' && e.lane === 1)).toBe(false);
  });
});
