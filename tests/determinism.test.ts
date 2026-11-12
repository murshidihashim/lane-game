// PLAN-001 T2, PLAN-004 T4: same starting seed + same moves => exactly the same match.
import { describe, expect, test } from 'vitest';
import { Bot } from '../src/game/bot';
import { type Command, Sim } from '../src/game/sim';
import { botMatch, replay } from './helpers';

describe('determinism', () => {
  test('the same bot-vs-bot match run twice is identical at every step', () => {
    const hashes: number[] = [];
    const a = botMatch(42, 3, (s) => hashes.push(s.hash()));
    let i = 0;
    const b = botMatch(42, 3, (s) => expect(s.hash()).toBe(hashes[i++]));
    expect(i).toBe(hashes.length);
    expect(b.sim.result).toEqual(a.sim.result);
    expect(b.sim.tick).toBe(a.sim.tick);
  });

  test('replaying only the logged moves reproduces the match exactly (random hero picks)', () => {
    for (const [seed, lanes] of [[7, 3], [8, 2], [21, 3], [33, 3]] as const) {
      const a = botMatch(seed, lanes);
      const r = replay(seed, lanes, a.log, a.picks);
      expect(r.hash()).toBe(a.sim.hash());
      expect(r.result).toEqual(a.sim.result);
    }
  });

  test('a human-style command list against the bot replays exactly', () => {
    const run = () => {
      const sim = new Sim({ seed: 99 });
      const bot = new Bot(1, 99);
      const [a, b] = sim.players[0].picks;
      const human: { tick: number; cmd: Command }[] = [
        { tick: 30, cmd: { t: 'order', player: 0, hero: a, order: 'gank', lane: 2 } },
        { tick: 120, cmd: { t: 'wave', player: 0, lane: 1, card: 'archers' } },
        { tick: 200, cmd: { t: 'buy', player: 0, hero: b, item: 'capal' } },
        { tick: 400, cmd: { t: 'order', player: 0, hero: b, order: 'move', x: 1950, y: 4800 } },
        { tick: 2600, cmd: { t: 'ult', player: 0, hero: a } },
      ];
      while (!sim.result) {
        for (const h of human) if (h.tick === sim.tick) sim.submit(h.cmd);
        for (const c of bot.think(sim)) sim.submit(c);
        sim.step();
      }
      return sim.hash();
    };
    expect(run()).toBe(run());
  });

  test('different seeds give different matches', () => {
    expect(botMatch(1).sim.hash()).not.toBe(botMatch(2).sim.hash());
  });
});
