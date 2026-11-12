// PLAN-001 T4: bot against bot, 100 matches finish with no errors. Run with: npm run soak
import { expect, test } from 'vitest';
import { botMatch } from '../helpers';

test('100 bot-vs-bot matches (3 lanes) finish with a result and no errors', () => {
  const tally = { blue: 0, red: 0, draw: 0, core: 0, towers: 0, sudden: 0 };
  let totalSeconds = 0;
  const t0 = Date.now();
  for (let seed = 1; seed <= 100; seed++) {
    const { sim } = botMatch(seed, 3);
    expect(sim.result).not.toBeNull();
    const r = sim.result!;
    if (r.winner === 0) tally.blue++;
    else if (r.winner === 1) tally.red++;
    else tally.draw++;
    if (r.reason !== 'draw') tally[r.reason]++;
    totalSeconds += sim.tick / 20;
    for (const e of sim.ents) {
      expect(Number.isInteger(e.x) && Number.isInteger(e.y) && Number.isInteger(e.hp)).toBe(true);
    }
  }
  console.log(`SOAK 100 matches in ${((Date.now() - t0) / 1000).toFixed(1)} s · results ${JSON.stringify(tally)} · average match ${(totalSeconds / 100).toFixed(0)} s`);
});

test('20 bot-vs-bot matches (2 lanes) finish with a result and no errors', () => {
  for (let seed = 101; seed <= 120; seed++) expect(botMatch(seed, 2).sim.result).not.toBeNull();
});
