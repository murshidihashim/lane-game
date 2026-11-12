// PLAN-001 T4 / PLAN-002 / PLAN-003 T5 / PLAN-004 T4: bot against bot, 100 matches finish with no
// errors. Every hero and species plays; map rewards, items and ultimates get used. Run with: npm run soak
import { expect, test } from 'vitest';
import { SHRINES } from '../../src/game/map';
import { HERO_IDS, SPECIES_IDS } from '../../src/game/rules';
import { type Sim } from '../../src/game/sim';
import { botMatch, speciesFor } from '../helpers';

const MAP_TEXTS: Record<string, string> = { 'Ward placed': 'wards', 'Jungle Fury!': 'fury', 'Gajah Mina joins you!': 'boss', 'First Strike!': 'firstKill' };

function countMap(sim: Sim, map: Record<string, number>): void {
  for (const ev of sim.events) {
    if (ev.k !== 'text') continue;
    const key = MAP_TEXTS[ev.text];
    if (key) map[key] = (map[key] ?? 0) + 1;
    if (SHRINES.some(([x, y]) => ev.x === x && ev.y === y - 100)) map.relics = (map.relics ?? 0) + 1;
  }
  for (const ev of sim.events) if (ev.k === 'ult') map.ultimates = (map.ultimates ?? 0) + 1;
}

test('100 bot-vs-bot matches (3 lanes, random heroes and species) finish with a result and no errors; every hero and species plays', () => {
  const tally = { blue: 0, red: 0, draw: 0, core: 0, towers: 0, sudden: 0 };
  const played: Record<string, number> = {};
  const wins: Record<string, number> = {};
  const spPlayed: Record<string, number> = {};
  const spWins: Record<string, number> = {};
  const map: Record<string, number> = {};
  let totalSeconds = 0;
  const t0 = Date.now();
  for (let seed = 1; seed <= 100; seed++) {
    const { sim, picks } = botMatch(seed, 3, (s) => countMap(s, map));
    expect(sim.result).not.toBeNull();
    const r = sim.result!;
    const species = speciesFor(seed);
    for (const p of [0, 1] as const) {
      expect(sim.players[p].species).toBe(species[p]);
      spPlayed[species[p]] = (spPlayed[species[p]] ?? 0) + 1;
      if (r.winner === p) spWins[species[p]] = (spWins[species[p]] ?? 0) + 1;
      for (const k of picks[p]) {
        if (sim.heroOf(p, k)) played[k] = (played[k] ?? 0) + 1;
        if (r.winner === p) wins[k] = (wins[k] ?? 0) + 1;
      }
    }
    if (r.winner === 0) tally.blue++;
    else if (r.winner === 1) tally.red++;
    else tally.draw++;
    if (r.reason !== 'draw') tally[r.reason]++;
    totalSeconds += sim.tick / 20;
    for (const e of sim.ents) {
      expect(Number.isInteger(e.x) && Number.isInteger(e.y) && Number.isInteger(e.hp)).toBe(true);
      if (e.kind === 'hero') map.items = (map.items ?? 0) + e.items.length;
    }
  }
  console.log(`SOAK 100 matches in ${((Date.now() - t0) / 1000).toFixed(1)} s · results ${JSON.stringify(tally)} · average match ${(totalSeconds / 100).toFixed(0)} s`);
  console.log(`SOAK heroes played (matches) ${JSON.stringify(played)}`);
  console.log(`SOAK hero wins ${JSON.stringify(wins)}`);
  console.log(`SOAK species played ${JSON.stringify(spPlayed)} · wins ${JSON.stringify(spWins)}`);
  console.log(`SOAK map use (100 matches) ${JSON.stringify(map)}`);
  for (const id of HERO_IDS) expect(played[id] ?? 0).toBeGreaterThan(0);
  for (const id of SPECIES_IDS) expect(spPlayed[id] ?? 0).toBeGreaterThan(0);
  for (const k of ['wards', 'fury', 'boss', 'relics', 'firstKill', 'items', 'ultimates']) expect(map[k] ?? 0, k).toBeGreaterThan(0);
});

test('20 bot-vs-bot matches (2 lanes) finish with a result and no errors', () => {
  for (let seed = 101; seed <= 120; seed++) expect(botMatch(seed, 2).sim.result).not.toBeNull();
});
