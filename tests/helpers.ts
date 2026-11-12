import { Bot } from '../src/game/bot';
import { CORES, LANES, type LaneId, pointAt, uToS } from '../src/game/map';
import { HERO_RULES, type HeroKind, type SpeciesId } from '../src/game/rules';
import { type Command, type Ent, type Order, type Player, Sim, randomPicks, randomSpecies } from '../src/game/sim';

export type Picks = [HeroKind[], HeroKind[]];

/** Random hero picks for both sides, from the match seed. */
export function picksFor(seed: number): Picks {
  return [randomPicks(seed ^ 0x5151), randomPicks(seed ^ 0xa3a3)];
}

/** Random species for both sides, from the match seed (DEC-008). */
export function speciesFor(seed: number): [SpeciesId, SpeciesId] {
  return [randomSpecies(seed ^ 0x7171), randomSpecies(seed ^ 0xc5c5)];
}

/** Run a full bot-vs-bot match. Returns the sim, the command log and the picks. */
export function botMatch(seed: number, lanes: 2 | 3 = 3, onTick?: (s: Sim) => void, picks: Picks = picksFor(seed)): { sim: Sim; log: { tick: number; cmd: Command }[]; picks: Picks } {
  const sim = new Sim({ seed, lanes, picks, species: speciesFor(seed) });
  const bots = [new Bot(0, seed ^ 0x5bd1e995), new Bot(1, seed)];
  const log: { tick: number; cmd: Command }[] = [];
  while (!sim.result) {
    for (const b of bots) for (const cmd of b.think(sim)) { sim.submit(cmd); log.push({ tick: sim.tick, cmd }); }
    sim.step();
    onTick?.(sim);
  }
  return { sim, log, picks };
}

/** Replay a command log on a fresh sim (no bots): must reproduce the match exactly. */
export function replay(seed: number, lanes: 2 | 3, log: { tick: number; cmd: Command }[], picks: Picks = picksFor(seed)): Sim {
  const sim = new Sim({ seed, lanes, picks, species: speciesFor(seed) });
  let i = 0;
  while (!sim.result) {
    while (i < log.length && log[i].tick === sim.tick) sim.submit(log[i++].cmd);
    sim.step();
  }
  return sim;
}

export function stepN(sim: Sim, n: number): void {
  for (let i = 0; i < n; i++) sim.step();
}

const order = (type: Order['type'], lane: LaneId = 0): Order => ({ type, lane, camp: 0, spot: 0, x: 0, y: 0 });

/**
 * Heroes start at the Pusaka (DEC-011). Put one of player p's heroes at distance u up a lane with a
 * Push order, as if it had just arrived there (it waits a moment before acting, like a fresh hero).
 */
export function heroOnLane(sim: Sim, p: Player, kind: HeroKind, lane: LaneId, u: number): Ent {
  const h = sim.heroOf(p, kind);
  if (!h) throw new Error(`${kind} is not one of player ${p}'s heroes`);
  h.order = order('push', lane);
  const [x, y] = pointAt(LANES[lane], uToS(LANES[lane], p, u));
  sim.place(h, x, y);
  h.deploy = HERO_RULES.startDelay;
  h.targetId = 0;
  return h;
}

/** Send a player's heroes (all, or all but one) home on Retreat, out of a test's way. */
export function parkHeroes(sim: Sim, p: Player, except?: HeroKind): void {
  sim.heroes(p).forEach((h, i) => {
    if (h.hero === except) return;
    h.order = order('retreat');
    sim.place(h, CORES[p][0] + (i ? 300 : -300), CORES[p][1] + (p === 0 ? -300 : 300));
    h.targetId = 0;
  });
}
