import { Bot } from '../src/game/bot';
import { type Command, Sim } from '../src/game/sim';

/** Run a full bot-vs-bot match. Returns the sim and the command log. */
export function botMatch(seed: number, lanes: 2 | 3 = 3, onTick?: (s: Sim) => void): { sim: Sim; log: { tick: number; cmd: Command }[] } {
  const sim = new Sim({ seed, lanes });
  const bots = [new Bot(0, seed ^ 0x5bd1e995), new Bot(1, seed)];
  const log: { tick: number; cmd: Command }[] = [];
  while (!sim.result) {
    for (const b of bots) for (const cmd of b.think(sim)) { sim.submit(cmd); log.push({ tick: sim.tick, cmd }); }
    sim.step();
    onTick?.(sim);
  }
  return { sim, log };
}

/** Replay a command log on a fresh sim (no bots): must reproduce the match exactly. */
export function replay(seed: number, lanes: 2 | 3, log: { tick: number; cmd: Command }[]): Sim {
  const sim = new Sim({ seed, lanes });
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
