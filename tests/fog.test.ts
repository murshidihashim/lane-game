// PLAN-004 T3: fog of war (DEC-012). Each side sees only around its own pieces; the bot plays by
// the same vision.
import { describe, expect, test } from 'vitest';
import { Bot } from '../src/game/bot';
import { LANES, WARD_SPOTS, pointAt, uToS } from '../src/game/map';
import { VISION } from '../src/game/rules';
import { Sim } from '../src/game/sim';
import { heroOnLane, parkHeroes } from './helpers';

function quiet(picks: [Parameters<typeof heroOnLane>[2][], Parameters<typeof heroOnLane>[2][]] = [['rimba', 'benteng'], ['rimba', 'benteng']]): Sim {
  const sim = new Sim({ seed: 5, waves: false, picks });
  parkHeroes(sim, 0);
  parkHeroes(sim, 1);
  return sim;
}

describe('fog of war', () => {
  test('you always see your own pieces, every tower, both Pusaka, camps and relics', () => {
    const sim = quiet();
    for (const e of sim.ents) {
      if (e.owner === 0 || e.kind === 'tower' || e.kind === 'core' || e.kind === 'camp') expect(sim.sees(0, e), `${e.kind} ${e.id}`).toBe(true);
    }
  });

  test('an enemy troop is seen only inside the vision of one of your pieces', () => {
    const sim = quiet();
    const [x, y] = pointAt(LANES[1], uToS(LANES[1], 0, 3600)); // middle lane, enemy half, far from towers
    const t = sim.summon(1, 'spearman', x, y, 1);
    expect(sim.sees(0, t)).toBe(false);
    expect(sim.sees(1, t)).toBe(true);
    const scout = sim.summon(0, 'spearman', x, y + VISION.unit - 50, 1);
    expect(sim.sees(0, t)).toBe(true);
    sim.place(scout, x, y + VISION.unit + 200);
    expect(sim.sees(0, t)).toBe(false);
  });

  test('wards and Seri\u2019s lanterns give vision; a Pelita lets a hero see further', () => {
    const sim = quiet();
    const [wx, wy] = WARD_SPOTS[4];
    const t = sim.summon(1, 'spearman', wx + 300, wy, 1);
    expect(sim.sees(0, t)).toBe(false);
    sim.addZone({ kind: 'lantern', owner: 0, x: wx, y: wy, r: 900, lane: 1, until: sim.tick + 100, heal: false });
    expect(sim.sees(0, t)).toBe(true);
    sim.zones = [];
    expect(sim.sees(0, t)).toBe(false);
    // A ward: plant one, send the hero far away, and the ward still watches.
    const h0 = heroOnLane(sim, 0, 'rimba', 1, 2500);
    h0.deploy = 0;
    sim.place(h0, wx, wy + 150);
    sim.submit({ t: 'order', player: 0, hero: 'rimba', order: 'ward', spot: 4 });
    for (let i = 0; i < 40 && sim.wards(0).length === 0; i++) sim.step();
    expect(sim.wards(0)).toHaveLength(1);
    parkHeroes(sim, 0);
    sim.place(t, wx + 300, wy);
    expect(sim.sees(0, t)).toBe(true);

    const s2 = quiet([['helang', 'benteng'], ['rimba', 'benteng']]);
    const h = heroOnLane(s2, 0, 'helang', 1, 2500);
    const far = s2.summon(1, 'spearman', h.x, h.y - VISION.hero - 150, 1);
    expect(s2.sees(0, far)).toBe(false);
    h.items.push('pelita');
    expect(s2.sees(0, far)).toBe(true);
  });

  test('a hero hidden in the jungle stays unseen even close to your pieces, until revealed', () => {
    const sim = quiet([['helang', 'benteng'], ['tedung', 'benteng']]);
    const h = heroOnLane(sim, 0, 'helang', 0, 2000);
    const e = heroOnLane(sim, 1, 'tedung', 0, 3000);
    e.deploy = 0;
    sim.place(e, 1300, 3700); // jungle
    sim.place(h, 1300, 3700 + 800); // within vision, outside reveal range
    sim.step();
    expect(e.hidden).toBe(true);
    expect(sim.sees(0, e)).toBe(false);
    sim.place(h, 1300, 3700 + 400); // close enough to spot it
    sim.step();
    expect(sim.sees(0, e)).toBe(true);
  });

  test('the bot does not react to an enemy hero it cannot see', () => {
    const run = (giveVision: boolean) => {
      const sim = new Sim({ seed: 8, waves: false, picks: [['gergasi', 'rimba'], ['helang', 'benteng']] });
      parkHeroes(sim, 0);
      const helang = sim.heroOf(1, 'helang')!;
      helang.hp = 0;
      sim.step();
      helang.respawn = 99_999; // out of the picture
      const benteng = sim.heroOf(1, 'benteng')!;
      const g = heroOnLane(sim, 0, 'gergasi', 0, 4400); // deep on the bot's half of the left lane
      g.deploy = 99_999; // stands still
      if (giveVision) sim.summon(1, 'spearman', g.x + 300, g.y - 300, 0).speed = 0;
      const bot = new Bot(1, 8);
      for (let i = 0; i < 200; i++) { for (const c of bot.think(sim)) sim.submit(c); sim.step(); }
      return benteng.order;
    };
    expect(run(false)).not.toMatchObject({ type: 'defend', lane: 0 }); // unseen: carries on
    expect(run(true)).toMatchObject({ type: 'defend', lane: 0 }); // seen: goes to defend the left lane
  });
});
