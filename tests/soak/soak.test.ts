// PLAN-001 T4 / PLAN-002 / PLAN-003 T5 / PLAN-004 T4: bot against bot, 100 matches finish with no
// errors. Every hero and species plays; map rewards, items and ultimates get used. Run with: npm run soak
import { expect, test } from 'vitest';
import { Bot } from '../../src/game/bot';
import { SHRINES, WARD_SPOTS } from '../../src/game/map';
import { Rng } from '../../src/game/math';
import { HERO_IDS, HERO_RULES, SPECIES_IDS } from '../../src/game/rules';
import { type Command, Sim } from '../../src/game/sim';
import { botMatch, picksFor, speciesFor } from '../helpers';

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
  const ultAt: number[] = []; // PLAN-011: seconds until each hero first reaches the ultimate level
  let heroCount = 0;
  const t0 = Date.now();
  for (let seed = 1; seed <= 100; seed++) {
    const reached = new Map<number, number>();
    const { sim, picks } = botMatch(seed, 3, (s) => {
      countMap(s, map);
      for (const e of s.ents) if (e.kind === 'hero' && e.level >= HERO_RULES.ultLevel && !reached.has(e.id)) reached.set(e.id, s.tick / 20);
    });
    heroCount += sim.ents.filter((e) => e.kind === 'hero').length;
    ultAt.push(...reached.values());
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
  // PLAN-011: the ultimate comes soon enough: median under 1:45, and 95% of heroes reach it by 3:00
  ultAt.sort((a, b) => a - b);
  const median = ultAt[Math.floor(ultAt.length / 2)];
  const by3min = ultAt.filter((t) => t <= 180).length / heroCount;
  console.log(`SOAK time to the ultimate: median ${median} s · by 3:00 ${(100 * by3min).toFixed(0)}% of ${heroCount} heroes`);
  expect(median).toBeLessThan(105);
  expect(by3min).toBeGreaterThanOrEqual(0.95);
  for (const id of HERO_IDS) expect(played[id] ?? 0).toBeGreaterThan(0);
  for (const id of SPECIES_IDS) expect(spPlayed[id] ?? 0).toBeGreaterThan(0);
  for (const k of ['wards', 'fury', 'boss', 'relics', 'firstKill', 'items', 'ultimates']) expect(map[k] ?? 0, k).toBeGreaterThan(0);
});

test('20 bot-vs-bot matches (2 lanes) finish with a result and no errors', () => {
  for (let seed = 101; seed <= 120; seed++) expect(botMatch(seed, 2).sim.result).not.toBeNull();
});

// PLAN-007 T1: heroes never stall. A player gives random orders every 3 s for 60 matches; a hero
// that stands still for 3 s must have a reason: holding its spot, fighting, farming a camp in
// reach, waiting outside an enemy tower, falling back, or Dalang staying behind his troops.
test('60 matches of random player orders: no hero stands still without a reason', () => {
  const stalls: string[] = [];
  for (let seed = 1; seed <= 60; seed++) {
    const sim = new Sim({ seed, picks: picksFor(seed), species: speciesFor(seed) });
    const bot = new Bot(1, seed);
    const rng = new Rng(seed * 7919);
    const still = new Map<number, { x: number; y: number; since: number; o: string }>();
    while (!sim.result) {
      for (const c of bot.think(sim)) sim.submit(c);
      if (sim.tick % 60 === 0) {
        const kinds = sim.players[0].picks;
        const hero = kinds[rng.int(kinds.length)];
        const lane = sim.lanes[rng.int(sim.lanes.length)];
        const orders: Command[] = [
          { t: 'order', player: 0, hero, order: 'push', lane },
          { t: 'order', player: 0, hero, order: 'gank', lane },
          { t: 'order', player: 0, hero, order: 'defend', lane },
          { t: 'order', player: 0, hero, order: 'farm', camp: rng.int(4) },
          { t: 'order', player: 0, hero, order: 'ward', spot: rng.int(WARD_SPOTS.length) },
          { t: 'order', player: 0, hero, order: 'move', x: 600 + rng.int(2700), y: 1000 + rng.int(5000) },
          { t: 'order', player: 0, hero, order: 'retreat' },
        ];
        sim.submit(orders[rng.int(orders.length)]);
      }
      sim.step();
      for (const h of sim.heroes(0)) {
        // A reason to stand still right now?
        const o = h.order;
        const fighting = sim.foes(0, h.x, h.y, h.range + h.r + 60, { structures: true }).length > 0;
        const camp = o.type === 'farm' ? sim.get(o.camp) : undefined;
        const farming = !!camp && camp.alive && Math.hypot(camp.x - h.x, camp.y - h.y) <= h.range + h.r + camp.r + 40;
        const holding = o.type === 'defend' || o.type === 'retreat' || (o.type === 'move' && Math.hypot(o.x - h.x, o.y - h.y) < 80);
        const busy = !h.alive || h.stun > 0 || h.deploy > 0 || fighting || farming || holding || h.waiting || h.fallback || (h.hero === 'dalang' && o.type === 'push');
        const key = JSON.stringify(o);
        const s = still.get(h.id);
        if (busy || !s || s.o !== key || Math.abs(s.x - h.x) > 15 || Math.abs(s.y - h.y) > 15) {
          still.set(h.id, { x: h.x, y: h.y, since: sim.tick, o: key });
          continue;
        }
        // 3 s in a row without moving and without any reason
        if (sim.tick - s.since === 60) stalls.push(`seed ${seed} tick ${sim.tick} ${h.hero} ${o.type} at (${h.x},${h.y})`);
      }
    }
  }
  console.log(`SOAK stalls: ${stalls.length}${stalls.length ? ' · ' + stalls.slice(0, 5).join(' | ') : ''}`);
  expect(stalls).toEqual([]);
});
