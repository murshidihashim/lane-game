// PLAN-001 T4: bot against bot, 100 matches finish with no errors. Run with: npm run soak
import { expect, test } from 'vitest';
import { HERO_IDS } from '../../src/game/rules';
import { botMatch } from '../helpers';

test('100 bot-vs-bot matches (3 lanes, random heroes) finish with a result and no errors; every hero plays', () => {
  const tally = { blue: 0, red: 0, draw: 0, core: 0, towers: 0, sudden: 0 };
  const played: Record<string, number> = {};
  const wins: Record<string, number> = {};
  let totalSeconds = 0;
  const t0 = Date.now();
  for (let seed = 1; seed <= 100; seed++) {
    const { sim, picks } = botMatch(seed, 3);
    expect(sim.result).not.toBeNull();
    const r = sim.result!;
    for (const p of [0, 1] as const) for (const k of picks[p]) {
      if (sim.heroOf(p, k)) played[k] = (played[k] ?? 0) + 1;
      if (r.winner === p) wins[k] = (wins[k] ?? 0) + 1;
    }
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
  console.log(`SOAK heroes played (matches) ${JSON.stringify(played)}`);
  console.log(`SOAK hero wins ${JSON.stringify(wins)}`);
  for (const id of HERO_IDS) expect(played[id] ?? 0).toBeGreaterThan(0);
});

test('20 bot-vs-bot matches (2 lanes) finish with a result and no errors', () => {
  for (let seed = 101; seed <= 120; seed++) expect(botMatch(seed, 2).sim.result).not.toBeNull();
});
