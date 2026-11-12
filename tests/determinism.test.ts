// PLAN-001 T2: same starting seed + same moves => exactly the same match.
import { describe, expect, test } from 'vitest';
import { Bot } from '../src/game/bot';
import { Sim } from '../src/game/sim';
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
      const human = [
        { tick: 30, cmd: { t: 'card', player: 0, card: sim.players[0].hand[0], lane: 0, u: 2000 } as const },
        { tick: 200, cmd: { t: 'card', player: 0, card: sim.players[0].hand[1], lane: 2, u: 2500 } as const },
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
