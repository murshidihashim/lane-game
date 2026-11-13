// Core rules: Semangat, items, waves, towers, winning. Plus the map's shape (DEC-003).
import { describe, expect, test } from 'vitest';
import { LANES, CENTER, rotate } from '../src/game/map';
import { isqrt } from '../src/game/math';
import { CLASSES, HEROES, HERO_RULES, ITEMS, ITEM_SLOTS, MANA, MATCH, MOVE, STRUCTURES, UNITS, WAVES, XP, sec } from '../src/game/rules';
import { Sim } from '../src/game/sim';
import { heroOnLane, parkHeroes, stepN } from './helpers';

describe('whole-number maths', () => {
  test('isqrt is exact', () => {
    for (const n of [0, 1, 2, 3, 4, 15, 16, 17, 99, 100, 101, 123456789, 48_000_000, 96_123_457]) {
      const r = isqrt(n);
      expect(r * r).toBeLessThanOrEqual(n);
      expect((r + 1) * (r + 1)).toBeGreaterThan(n);
    }
  });
});

describe('levelling (PLAN-011)', () => {
  test('every living hero gains XP each second on its own, and the ultimate comes from that alone within the match', () => {
    const sim = new Sim({ seed: 1, waves: false });
    parkHeroes(sim, 0);
    parkHeroes(sim, 1);
    const h = sim.heroes(0)[0];
    stepN(sim, sec(30) + 1); // the trickle lands on each whole second after the start
    expect(h.heroXp).toBe(30 * XP.trickle);
    // with no fights at all, the trickle alone reaches the ultimate level before regulation time ends
    const needed = XP.levels[HERO_RULES.ultLevel - 1] / XP.trickle;
    expect(needed).toBeLessThan(MATCH.regulation / sec(1));
    stepN(sim, sec(needed - 30));
    expect(h.level).toBe(HERO_RULES.ultLevel);
    expect(h.ultReady).toBe(true);
  });

  test('a dead hero gains no trickle XP', () => {
    const sim = new Sim({ seed: 1, waves: false });
    parkHeroes(sim, 0);
    parkHeroes(sim, 1);
    const h = sim.heroes(0)[0];
    h.hp = 0;
    stepN(sim, 1);
    expect(h.alive).toBe(false);
    const before = h.heroXp;
    stepN(sim, sec(5));
    expect(h.heroXp).toBe(before);
  });
});

describe('combat events for the screen (PLAN-013)', () => {
  test('a hit says who struck whom and for how much; a death says what died', () => {
    const sim = new Sim({ seed: 3, waves: false });
    parkHeroes(sim, 0);
    parkHeroes(sim, 1);
    const a = sim.summon(0, 'spearman', 2000, 3000, 0);
    const t = sim.summon(1, 'kerengga', 2000, 3120, 0);
    a.speed = 0;
    t.speed = 0;
    let hit: { from?: number; to?: number; dmg?: number } | undefined;
    let death: { id?: number; unit?: string } | undefined;
    for (let i = 0; i < sec(10) && !death; i++) {
      sim.step();
      for (const ev of sim.events) {
        if (ev.k === 'hit' && ev.from === a.id && !hit) hit = ev;
        if (ev.k === 'death' && ev.id === t.id) death = ev;
      }
    }
    expect(hit?.to).toBe(t.id);
    expect(hit?.dmg ?? 0).toBeGreaterThan(0);
    expect(death?.unit).toBe('kerengga');
  });
});

describe('map', () => {
  test('the map is the same when turned upside down', () => {
    const [left, mid, right] = LANES;
    expect(left.pts.map(rotate).reverse()).toEqual(right.pts);
    expect(mid.pts.map(rotate).reverse()).toEqual(mid.pts);
    expect(rotate([CENTER.x, CENTER.y])).toEqual([CENTER.x, CENTER.y]);
  });

  test('the middle lane is at least 30% longer from the river to its tower (DEC-003)', () => {
    const riverToTower = (i: number) => LANES[i].length / 2 - LANES[i].towerS;
    expect(riverToTower(1)).toBeGreaterThan(riverToTower(0) * 1.3);
    expect(riverToTower(0)).toBe(riverToTower(2));
  });
});

/** A match where nothing fights: no waves, every hero waiting at home (no bounties either). */
const still = () => {
  const sim = new Sim({ seed: 1, waves: false });
  parkHeroes(sim, 0);
  parkHeroes(sim, 1);
  return sim;
};

describe('Semangat', () => {
  test('starts at 4, refills 1 every 8 s, caps at 20', () => {
    const sim = still();
    expect(sim.players[0].mana).toBe(4 * MANA.perMana);
    stepN(sim, sec(8));
    expect(sim.players[0].mana).toBe(5 * MANA.perMana);
    stepN(sim, sec(200));
    expect(sim.players[0].mana).toBe(MANA.max);
    expect(MANA.max).toBe(20 * MANA.perMana);
  });

  test('refills twice as fast in the last minute', () => {
    const sim = still();
    stepN(sim, MATCH.doubleManaFrom);
    sim.players[0].mana = 0;
    stepN(sim, sec(4));
    expect(sim.players[0].mana).toBe(MANA.perMana);
  });
});

describe('pace (DEC-016)', () => {
  test('troops and heroes walk at 70% of their listed speed, in whole world units per tick', () => {
    expect(MOVE.speedPct).toBe(70);
    // listed speed -> walking speed
    expect(UNITS.spearman.speed).toBe(6); // 9
    expect(UNITS.kera.speed).toBe(11); // 15
    expect(UNITS.golem.speed).toBe(4); // 5
    expect(UNITS.watchtower.speed).toBe(0); // doesn't move
    expect(HEROES.rimba.speed).toBe(8); // 12
    expect(HEROES.layang.speed).toBe(10); // 14
    for (const u of Object.values(UNITS)) expect(Number.isInteger(u.speed)).toBe(true);
    for (const h of Object.values(HEROES)) expect(Number.isInteger(h.speed)).toBe(true);
  });
});

describe('no hand cards (DEC-011)', () => {
  test('a player has no hand or deck: only lane troops, hero orders, items and ultimates', () => {
    const sim = new Sim({ seed: 1 });
    // DEC-024 adds two commander calls picked before the match and PLAN-015 rallied lanes: still no hand, deck or draws.
    expect(Object.keys(sim.players[0]).sort()).toEqual(['callCd', 'calls', 'halfPrice', 'held', 'heroIds', 'hold', 'laneClass', 'mana', 'manaSlow', 'picks', 'species', 'towersDestroyed']);
  });

  test('lane waves are the only troops: full strength at first, stronger each minute', () => {
    const sim = new Sim({ seed: 1, species: ['kampung', 'kampung'] });
    parkHeroes(sim, 0);
    parkHeroes(sim, 1);
    stepN(sim, WAVES.first + 1);
    const first = sim.ents.filter((e) => e.kind === 'unit' && e.owner === 0);
    expect(first.every((e) => e.wave)).toBe(true);
    const cls = CLASSES[sim.players[0].laneClass[0]];
    const one = first.find((e) => e.lane === 0)!;
    expect(one.maxHp).toBe(UNITS[cls.unit].hp);
    stepN(sim, sec(60));
    const later = sim.ents.filter((e) => e.kind === 'unit' && e.owner === 0 && e.lane === 0 && e.unit === cls.unit);
    const newest = later.reduce((a, b) => (b.id > a.id ? b : a));
    expect(newest.maxHp).toBe(Math.trunc((UNITS[cls.unit].hp * (100 + WAVES.growPctPerMinute)) / 100));
  });
});

describe('items (DEC-011)', () => {
  const setup = () => {
    const sim = new Sim({ seed: 1, waves: false, picks: [['pendekar', 'helang'], ['rimba', 'benteng']] });
    parkHeroes(sim, 1);
    const h = heroOnLane(sim, 0, 'pendekar', 0, 3000); // out of tower range
    stepN(sim, 22);
    h.powerCd = 9999;
    return { sim, h };
  };

  test('buying costs Semangat, fills a slot and works at once; kept through death', () => {
    const { sim, h } = setup();
    sim.players[0].mana = 10 * MANA.perMana;
    const hp = h.maxHp;
    sim.submit({ t: 'buy', player: 0, hero: 'pendekar', item: 'baju' });
    sim.step();
    expect(h.items).toEqual(['baju']);
    expect(sim.players[0].mana).toBe((10 - ITEMS.baju.cost) * MANA.perMana + MANA.regenPerTick);
    expect(h.maxHp).toBe(Math.trunc((hp * 130) / 100));
    h.hp = 0;
    sim.step();
    stepN(sim, h.respawn + 2);
    expect(h.alive).toBe(true);
    expect(h.items).toEqual(['baju']);
    expect(h.maxHp).toBe(Math.trunc((hp * 130) / 100));
  });

  test('damage, attack speed, armour and power cooldown items change the hero', () => {
    const { sim, h } = setup();
    const t = sim.summon(1, 'spearman', h.x, h.y - 200, 0);
    t.speed = 0;
    h.atkCd = 0;
    let before = t.hp;
    sim.step();
    const plain = before - t.hp;
    sim.players[0].mana = MANA.max;
    for (const item of ['keris', 'gelang'] as const) sim.submit({ t: 'buy', player: 0, hero: 'pendekar', item });
    sim.step();
    sim.players[0].mana = MANA.max;
    sim.submit({ t: 'buy', player: 0, hero: 'pendekar', item: 'rotan' });
    sim.step();
    expect(h.items).toEqual(['keris', 'gelang', 'rotan']);
    t.hp = t.maxHp;
    h.atkCd = 0;
    before = t.hp;
    sim.step();
    expect(before - t.hp).toBeGreaterThan(plain); // Keris: +20%
    expect(h.atkCd).toBeLessThan(h.attackTicks); // Gelang: hits come sooner
    const hpBefore = h.hp;
    sim.hurt(h, 100, null, false);
    expect(hpBefore - h.hp).toBe(80); // Rotan: 20% less

    // Tangkal: the power comes back 30% sooner.
    const he = heroOnLane(sim, 0, 'helang', 0, 3000);
    he.deploy = 0;
    sim.players[0].mana = MANA.max;
    sim.submit({ t: 'buy', player: 0, hero: 'helang', item: 'tangkal' });
    sim.step();
    sim.summon(1, 'spearman', he.x, he.y - 400, 0).speed = 0;
    he.powerCd = 0;
    sim.step();
    expect(he.powerCd).toBe(Math.trunc((HEROES.helang.powerTicks * 70) / 100));
  });

  test('3 slots, no doubles, and not without enough Semangat', () => {
    const { sim, h } = setup();
    sim.players[0].mana = 3 * MANA.perMana;
    sim.submit({ t: 'buy', player: 0, hero: 'pendekar', item: 'keris' }); // costs 7
    sim.step();
    expect(h.items).toEqual([]);
    expect(sim.cantBuy(0, 'pendekar', 'keris')).toBe('semangat');
    sim.players[0].mana = MANA.max;
    for (const item of ['keris', 'keris', 'capal', 'jamu', 'pelita'] as const) sim.submit({ t: 'buy', player: 0, hero: 'pendekar', item });
    sim.step();
    expect(h.items).toEqual(['keris', 'capal', 'jamu']);
    expect(h.items.length).toBe(ITEM_SLOTS);
    expect(sim.cantBuy(0, 'pendekar', 'pelita')).toBe('full');
  });
});

describe('towers and winning', () => {
  test('towers take half damage in the first minute', () => {
    const sim = new Sim({ seed: 1, waves: false });
    const t = sim.towerOf(1, 0)!;
    sim.hurt(t, 78, null);
    expect(t.hp).toBe(STRUCTURES.tower.hp - 39);
    stepN(sim, MATCH.towerShieldUntil);
    const before = t.hp;
    sim.hurt(t, 78, null);
    expect(t.hp).toBe(before - 78);
  });

  test('destroying an enemy tower counts for its destroyer', () => {
    const sim = new Sim({ seed: 1, waves: false });
    sim.towerOf(1, 0)!.hp = 0;
    sim.step();
    expect(sim.players[0].towersDestroyed).toBe(1);
    expect(sim.players[1].towersDestroyed).toBe(0);
  });

  test('destroying the enemy Core wins at once', () => {
    const sim = new Sim({ seed: 1, waves: false });
    sim.coreOf(1).hp = 0;
    sim.step();
    expect(sim.result).toEqual({ winner: 0, reason: 'core' });
  });

  test('at 5:00 more towers wins', () => {
    const sim = still();
    stepN(sim, 100);
    sim.towerOf(0, 2)!.hp = 0;
    stepN(sim, MATCH.regulation);
    expect(sim.result).toEqual({ winner: 1, reason: 'towers' });
    expect(sim.tick).toBe(MATCH.regulation);
  });

  test('level at 5:00 goes to sudden death: next tower wins, otherwise a draw', () => {
    const a = still();
    stepN(a, MATCH.regulation);
    expect(a.result).toBeNull();
    expect(a.phase()).toBe('sudden');
    a.towerOf(1, 1)!.hp = 0;
    a.step();
    expect(a.result).toEqual({ winner: 0, reason: 'sudden' });

    const b = still();
    stepN(b, MATCH.regulation + MATCH.suddenDeath);
    expect(b.result).toEqual({ winner: null, reason: 'draw' });
  });
});
