// PLAN-003 T3/T4: ward order, wards revealing and paying, and the map rewards.
import { describe, expect, test } from 'vitest';
import { BOSS_PIT, DENS, SHRINES, WARD_SPOTS, inJungle, rotate } from '../src/game/map';
import { BOUNTY, NEUTRALS, RELICS, WARDS, type HeroKind } from '../src/game/rules';
import { type Ent, Sim } from '../src/game/sim';
import { heroOnLane, parkHeroes, stepN } from './helpers';

function withHero(hero: HeroKind = 'rimba', u = 2600, foes: HeroKind[] = ['tedung', 'pendekar']): { sim: Sim; h: Ent } {
  const sim = new Sim({ seed: 31, waves: false, picks: [[hero, 'benteng'], foes] });
  parkHeroes(sim, 0, hero);
  parkHeroes(sim, 1);
  const h = heroOnLane(sim, 0, hero, 0, u);
  stepN(sim, 22);
  h.powerCd = 9999;
  return { sim, h };
}

/** One of player 1's heroes brought to a spot. */
function enemyHero(sim: Sim, kind: HeroKind, x: number, y: number): Ent {
  const e = heroOnLane(sim, 1, kind, 0, 3000);
  e.deploy = 0;
  e.powerCd = 9999;
  sim.place(e, x, y);
  return e;
}

describe('map layout', () => {
  test('ward spots, dens and shrines sit in the jungle, and the map is fair to both sides', () => {
    for (const p of [...WARD_SPOTS, ...DENS, ...SHRINES]) {
      expect(inJungle(p[0], p[1], [0, 1, 2]), String(p)).toBe(true);
      expect(inJungle(p[0], p[1], [0, 2]), String(p)).toBe(true);
    }
    for (let i = 0; i < 3; i++) expect(rotate(WARD_SPOTS[i])).toEqual(WARD_SPOTS[i + 3]);
    expect(rotate(DENS[0])).toEqual(DENS[1]);
    for (let i = 0; i < 2; i++) expect(rotate(SHRINES[i])).toEqual(SHRINES[i + 2]);
    expect(rotate(BOSS_PIT)).toEqual(BOSS_PIT);
  });
});

describe('wards', () => {
  test('the ward order plants a ward, then the hero goes back to its job', () => {
    const { sim, h } = withHero();
    sim.submit({ t: 'order', player: 0, hero: 'rimba', order: 'ward', spot: 0 });
    for (let i = 0; i < 400 && sim.wards(0).length === 0; i++) sim.step();
    const w = sim.wards(0)[0];
    expect(w).toBeDefined();
    expect(w.spot).toBe(0);
    expect(h.heroXp).toBeGreaterThanOrEqual(WARDS.placeXp);
    sim.step();
    expect(h.order.type).toBe('push');
  });

  test('a ward reveals hidden enemy heroes near it', () => {
    const { sim } = withHero();
    const [wx, wy] = WARD_SPOTS[1];
    const e = enemyHero(sim, 'tedung', wx + 300, wy + 300);
    sim.step();
    expect(e.hidden).toBe(true);
    sim.submit({ t: 'order', player: 0, hero: 'rimba', order: 'ward', spot: 1 });
    for (let i = 0; i < 500 && sim.wards(0).length === 0; i++) { sim.place(e, wx + 300, wy + 300); sim.step(); }
    sim.place(e, wx + 300, wy + 300);
    sim.step();
    expect(e.hidden).toBe(false);
  });

  test('clearing an enemy ward pays a bounty; a ward that runs out pays nothing', () => {
    const { sim, h } = withHero();
    sim.submit({ t: 'order', player: 0, hero: 'rimba', order: 'ward', spot: 0 });
    for (let i = 0; i < 400 && sim.wards(0).length === 0; i++) sim.step();
    const ward = sim.wards(0)[0];
    const foe = enemyHero(sim, 'pendekar', ward.x, ward.y - 150);
    sim.place(h, 3300, 1500); // far away
    sim.players[1].mana = 0;
    for (let i = 0; i < 200 && ward.alive; i++) { sim.players[1].mana = 0; sim.step(); }
    expect(ward.alive).toBe(false);
    expect(sim.players[1].mana).toBeGreaterThanOrEqual(WARDS.bountyMana);
    expect(foe.heroXp).toBeGreaterThanOrEqual(WARDS.bountyXp);

    const b = withHero();
    b.sim.submit({ t: 'order', player: 0, hero: 'rimba', order: 'ward', spot: 2 });
    for (let i = 0; i < 400 && b.sim.wards(0).length === 0; i++) b.sim.step();
    stepN(b.sim, WARDS.life + 5);
    expect(b.sim.wards(0)).toHaveLength(0);
  });
});

describe('map rewards', () => {
  test('a beast den gives the hero Jungle Fury', () => {
    const { sim, h } = withHero('belang');
    sim.place(h, DENS[0][0], DENS[0][1] + 250);
    const den = sim.camps()[2];
    den.hp = 50;
    sim.submit({ t: 'order', player: 0, hero: 'belang', order: 'farm', camp: 2 });
    for (let i = 0; i < 100 && den.alive; i++) sim.step();
    expect(den.alive).toBe(false);
    expect(h.fury).toBeGreaterThan(0);
  });

  test('Gajah Mina rises at 1:30 and joins the side that beats it', () => {
    const { sim, h } = withHero('helang', 3000);
    const boss = sim.camps()[4];
    expect(boss.alive).toBe(false);
    stepN(sim, NEUTRALS.boss.first);
    expect(boss.alive).toBe(true);
    boss.hp = 40;
    boss.lastHitTick = sim.tick; // otherwise an untouched camp heals back to full
    sim.place(h, BOSS_PIT[0], BOSS_PIT[1] + 600);
    sim.submit({ t: 'order', player: 0, hero: 'helang', order: 'farm', camp: 4 });
    for (let i = 0; i < 100 && boss.alive; i++) sim.step();
    expect(boss.alive).toBe(false);
    const ally = sim.ents.find((e) => e.kind === 'unit' && e.unit === 'gajahmina');
    expect(ally?.owner).toBe(0);
  });

  test('relics appear in pairs and pay the hero who takes one', () => {
    const { sim, h } = withHero();
    for (let i = 0; i < RELICS.first && sim.relics().length === 0; i++) sim.step();
    expect(sim.tick).toBeLessThanOrEqual(RELICS.first + 1);
    expect(sim.relics()).toHaveLength(2);
    const r = sim.relics()[0];
    sim.players[0].mana = 0;
    sim.place(h, r.x, r.y);
    sim.step();
    expect(r.alive).toBe(false);
    expect(sim.players[0].mana).toBeGreaterThanOrEqual(RELICS.mana); // the first relic pays Semangat
  });

  test('hero kills pay a bounty (extra for the first one); towers pay too', () => {
    const { sim, h } = withHero('helang', 2600, ['pelanduk', 'tedung']);
    const e = enemyHero(sim, 'pelanduk', h.x, h.y - 400);
    e.hp = 5;
    e.ultReady = false;
    sim.players[0].mana = 0;
    for (let i = 0; i < 60 && e.alive; i++) { sim.players[0].mana = 0; sim.step(); }
    expect(e.alive).toBe(false);
    expect(sim.players[0].mana).toBeGreaterThanOrEqual(BOUNTY.heroKill + BOUNTY.firstKill);

    const t = sim.towerOf(1, 2)!;
    sim.players[0].mana = 0;
    t.hp = 0;
    sim.step();
    expect(sim.players[0].mana).toBeGreaterThanOrEqual(BOUNTY.tower);
  });
});
