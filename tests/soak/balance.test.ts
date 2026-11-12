// PLAN-005 T1: the balance check. 1,200 bot-vs-bot matches (about 8 minutes; fewer swing too much) (3 lanes, random species and heroes);
// win rates by species and hero, match pace, items and ultimates. Run with: npm run balance
// For a quicker look while tuning, run slices in parallel: BALANCE_SLICE=0/4 ... 3/4 (no targets
// checked; each prints one BALANCE_PART line of JSON to add up).
import { expect, test } from 'vitest';
import { HERO_IDS, SPECIES_IDS } from '../../src/game/rules';
import { botMatch, speciesFor } from '../helpers';

// No Node type definitions in this project: read the environment the same way vite.config.ts does.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const N = Number(env.BALANCE_N ?? 1200);
const FIRST_SEED = 1000;

interface Tally {
  matches: number; draws: number; seconds: number; early: number; byReason: Record<string, number>;
  played: Record<string, number>; score: Record<string, number>; items: number; ults: number;
}

function run(from: number, to: number): Tally {
  const t: Tally = { matches: 0, draws: 0, seconds: 0, early: 0, byReason: {}, played: {}, score: {}, items: 0, ults: 0 };
  for (let seed = from; seed < to; seed++) {
    let ults = 0;
    const { sim, picks } = botMatch(seed, 3, (s) => { for (const ev of s.events) if (ev.k === 'ult') ults++; });
    const r = sim.result;
    if (!r) throw new Error(`match ${seed} has no result`);
    const species = speciesFor(seed);
    t.matches++;
    t.seconds += sim.tick / 20;
    if (r.winner === null) t.draws++;
    else if (sim.tick < 150 * 20) t.early++; // decided before 2:30
    t.byReason[r.reason] = (t.byReason[r.reason] ?? 0) + 1;
    t.ults += ults;
    for (const p of [0, 1] as const) {
      // a win scores 1, a draw a half
      const s = r.winner === p ? 1 : r.winner === null ? 0.5 : 0;
      for (const k of [species[p], ...picks[p]]) {
        t.played[k] = (t.played[k] ?? 0) + 1;
        t.score[k] = (t.score[k] ?? 0) + s;
      }
      for (const h of sim.heroes(p)) t.items += h.items.length;
    }
  }
  return t;
}

function report(t: Tally): Record<string, number> {
  const rate = (k: string) => Math.round((100 * (t.score[k] ?? 0)) / Math.max(1, t.played[k] ?? 0));
  const rows = (ids: readonly string[]) => ids.map((k) => `${k} ${rate(k)}% (${t.played[k] ?? 0})`).join(' · ');
  console.log(`BALANCE ${t.matches} matches · draws ${t.draws} · decided before 2:30: ${t.early} · average ${(t.seconds / t.matches).toFixed(0)} s · ${JSON.stringify(t.byReason)}`);
  console.log(`BALANCE species: ${rows(SPECIES_IDS)}`);
  console.log(`BALANCE heroes: ${rows(HERO_IDS)}`);
  console.log(`BALANCE items per hero ${(t.items / (t.matches * 6)).toFixed(2)} · ultimates per match ${(t.ults / t.matches).toFixed(2)}`);
  return Object.fromEntries([...SPECIES_IDS, ...HERO_IDS].map((k) => [k, rate(k)]));
}

test(`balance: ${N} bot-vs-bot matches`, () => {
  const slice = env.BALANCE_SLICE;
  if (slice) {
    const [i, n] = slice.split('/').map(Number);
    const size = Math.ceil(N / n);
    const t = run(FIRST_SEED + i * size, FIRST_SEED + Math.min(N, (i + 1) * size));
    console.log(`BALANCE_PART ${JSON.stringify(t)}`);
    return;
  }
  const t = run(FIRST_SEED, FIRST_SEED + N);
  const rates = report(t);
  // PLAN-005 T1 targets
  for (const s of SPECIES_IDS) { expect(rates[s], s).toBeGreaterThanOrEqual(40); expect(rates[s], s).toBeLessThanOrEqual(60); }
  for (const h of HERO_IDS) { expect(rates[h], h).toBeGreaterThanOrEqual(35); expect(rates[h], h).toBeLessThanOrEqual(65); }
  expect(t.draws / t.matches).toBeLessThan(0.15);
  expect(t.early / t.matches).toBeLessThanOrEqual(0.1);
});
