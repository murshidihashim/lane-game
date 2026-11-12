// PLAN-003 T1/T2: species, troop classes and their abilities, lane waves (troops come only from
// lane waves: DEC-011).
import { describe, expect, test } from 'vitest';
import { CLASSES, CLASS_IDS, SPECIES, SPECIES_IDS, UNITS, WAVES, type ClassId, type SpeciesId, type UnitKind } from '../src/game/rules';
import { type Ent, Sim } from '../src/game/sim';
import { parkHeroes, stepN } from './helpers';

const speciesOf = (c: ClassId): SpeciesId => SPECIES_IDS.find((s) => SPECIES[s].classes.includes(c)) as SpeciesId;

function quiet(species: SpeciesId = 'kampung', foeSpecies: SpeciesId = 'kampung'): Sim {
  const sim = new Sim({ seed: 21, waves: false, species: [species, foeSpecies] });
  parkHeroes(sim, 0);
  parkHeroes(sim, 1);
  return sim;
}

/** Units of a kind, side by side at a spot on the left lane, already active. */
function put(sim: Sim, owner: 0 | 1, kind: UnitKind, x: number, y: number): Ent {
  const e = sim.summon(owner, kind, x, y, 0);
  e.deploy = 0;
  return e;
}

describe('species', () => {
  test('5 species with 3-4 classes each; every class belongs to exactly one species', () => {
    expect(SPECIES_IDS).toHaveLength(5);
    for (const s of SPECIES_IDS) {
      expect(SPECIES[s].classes.length).toBeGreaterThanOrEqual(3);
      expect(SPECIES[s].classes.length).toBeLessThanOrEqual(4);
    }
    const all = SPECIES_IDS.flatMap((s) => SPECIES[s].classes);
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual([...CLASS_IDS].sort());
  });

  test('your lanes start with your species\u2019 classes', () => {
    for (const sp of SPECIES_IDS) {
      const sim = new Sim({ seed: 3, species: [sp, 'kampung'] });
      for (const c of sim.players[0].laneClass) expect(SPECIES[sp].classes).toContain(c);
    }
  });

  test('every class marches in its lane wave, full strength', () => {
    for (const c of CLASS_IDS) {
      const sim = new Sim({ seed: 21, species: [speciesOf(c), 'kampung'] });
      parkHeroes(sim, 0);
      parkHeroes(sim, 1);
      sim.submit({ t: 'wave', player: 0, lane: 0, card: c });
      stepN(sim, WAVES.first + 1);
      const def = CLASSES[c];
      const units = sim.ents.filter((e) => e.kind === 'unit' && e.owner === 0 && e.lane === 0 && e.unit === def.unit);
      expect(units, c).toHaveLength(def.wave);
      expect(units[0].maxHp).toBe(UNITS[def.unit].hp);
    }
  });
});

describe('lane waves', () => {
  test('each lane sends a wave of the class chosen for it, at wave strength', () => {
    const sim = new Sim({ seed: 4, species: ['kampung', 'batu'] });
    sim.submit({ t: 'wave', player: 0, lane: 0, card: 'archers' });
    sim.submit({ t: 'wave', player: 0, lane: 2, card: 'ram' });
    stepN(sim, WAVES.first + 1);
    const lane = (id: number) => sim.ents.filter((e) => e.kind === 'unit' && e.owner === 0 && e.lane === id && e.wave);
    expect(lane(0).map((e) => e.unit)).toEqual(['archer', 'archer']);
    expect(lane(2).map((e) => e.unit)).toEqual(['ram']);
    expect(lane(1).every((e) => e.unit === CLASSES[sim.players[0].laneClass[1]].unit)).toBe(true);
    expect(lane(1).length).toBe(CLASSES[sim.players[0].laneClass[1]].wave);
    expect(lane(0)[0].maxHp).toBe(UNITS.archer.hp);
    // the opponent's lanes follow their own species
    const foe = sim.ents.filter((e) => e.kind === 'unit' && e.owner === 1 && e.wave).map((e) => e.unit);
    for (const u of foe) expect(SPECIES.batu.classes.map((c) => CLASSES[c].unit)).toContain(u);
  });

  test('changing a lane only changes that lane; another species’ class is refused', () => {
    const sim = new Sim({ seed: 4, species: ['sungai', 'kampung'] });
    const before = [...sim.players[0].laneClass];
    sim.submit({ t: 'wave', player: 0, lane: 1, card: 'ketam' });
    sim.submit({ t: 'wave', player: 0, lane: 2, card: 'kera' }); // a Hutan class: refused
    sim.step();
    expect(sim.players[0].laneClass).toEqual([before[0], 'ketam', before[2]]);
  });
});

describe('class abilities', () => {
  const X = 570;
  const Y = 4000;

  test('flying: melee troops can’t hit Enggang, archers can', () => {
    const sim = quiet('hutan');
    const bird = put(sim, 0, 'enggang', X, Y);
    bird.speed = 0;
    const melee = put(sim, 1, 'spearman', X, Y - 150);
    melee.speed = 0;
    stepN(sim, 40);
    expect(bird.hp).toBe(UNITS.enggang.hp);
    put(sim, 1, 'archer', X, Y - 400).speed = 0;
    stepN(sim, 40);
    expect(bird.hp).toBeLessThan(UNITS.enggang.hp);
  });

  test('splash: Lontar hits a whole group', () => {
    const sim = quiet('batu');
    const sling = put(sim, 0, 'lontar', X, Y);
    sling.speed = 0;
    const group = [-60, 0, 60].map((dx) => { const e = put(sim, 1, 'spearman', X + dx, Y - 500); e.speed = 0; return e; });
    stepN(sim, 60);
    expect(group.filter((e) => e.hp < UNITS.spearman.hp).length).toBe(3);
  });

  test('armour: Ketam halves ranged hits, Kumbang takes 20% less', () => {
    const sim = quiet('sungai');
    const crab = put(sim, 0, 'ketam', X, Y);
    crab.speed = 0;
    const archer = put(sim, 1, 'archer', X, Y - 450);
    archer.speed = 0;
    archer.atkCd = 0;
    sim.step();
    expect(UNITS.ketam.hp - crab.hp).toBe(Math.trunc((UNITS.archer.damage * (UNITS.ketam.armorRanged ?? 100)) / 100));
    const s2 = quiet('serangga');
    const beetle = put(s2, 0, 'kumbang', X, Y);
    beetle.speed = 0;
    const sp = put(s2, 1, 'spearman', X, Y - 150);
    sp.speed = 0;
    sp.atkCd = 0;
    s2.step();
    expect(UNITS.kumbang.hp - beetle.hp).toBe(Math.trunc((UNITS.spearman.damage * (UNITS.kumbang.armor ?? 100)) / 100));
  });

  test('on-hit effects: Ikan Sumpit slows, Tebuan poisons, Belut chains', () => {
    const sim = quiet('sungai');
    const fish = put(sim, 0, 'sumpit', X, Y);
    fish.speed = 0;
    const t = put(sim, 1, 'shieldbearer', X, Y - 450);
    t.speed = 0;
    fish.atkCd = 0;
    sim.step();
    expect(t.slow).toBeGreaterThan(0);

    const s2 = quiet('serangga');
    const hornet = put(s2, 0, 'tebuan', X, Y);
    hornet.speed = 0;
    const t2 = put(s2, 1, 'shieldbearer', X, Y - 150);
    t2.speed = 0;
    hornet.atkCd = 0;
    s2.step();
    expect(t2.dot).toBeGreaterThan(0);

    const s3 = quiet('sungai');
    const eel = put(s3, 0, 'belut', X, Y);
    eel.speed = 0;
    const a = put(s3, 1, 'shieldbearer', X, Y - 250);
    const b = put(s3, 1, 'shieldbearer', X + 150, Y - 300);
    a.speed = 0; b.speed = 0;
    eel.atkCd = 0;
    s3.step();
    expect(a.hp < UNITS.shieldbearer.hp && b.hp < UNITS.shieldbearer.hp).toBe(true);
  });

  test('Seladang’s first hit knocks back and stuns; Harimau Bintang leaps', () => {
    const sim = quiet('hutan');
    const gaur = put(sim, 0, 'seladang', X, Y);
    gaur.speed = 0;
    const t = put(sim, 1, 'shieldbearer', X, Y - 200);
    t.speed = 0;
    gaur.atkCd = 0;
    const y0 = t.y;
    sim.step();
    expect(t.stun).toBeGreaterThan(0);
    expect(y0 - t.y).toBeGreaterThan(100);

    const s2 = quiet('hutan');
    const cat = put(s2, 0, 'harimau', X, Y);
    const far = put(s2, 1, 'archer', X, Y - 420);
    far.speed = 0;
    s2.step();
    expect(Math.hypot(cat.x - far.x, cat.y - far.y)).toBeLessThan(250);
  });

  test('Kerikil bursts on a tower; Ratu Sarang hatches ants', () => {
    const sim = quiet('batu');
    const tower = sim.towerOf(1, 0)!;
    const pebble = put(sim, 0, 'kerikil', tower.x, tower.y + 300);
    stepN(sim, 40);
    expect(pebble.alive).toBe(false);
    expect(tower.hp).toBe(tower.maxHp - (UNITS.kerikil.bomb ?? 0) / 2); // halved by the first-minute tower shield

    const s2 = quiet('serangga');
    const queen = put(s2, 0, 'ratu', X, Y);
    queen.speed = 0;
    stepN(s2, UNITS.ratu.spawn!.every + 2);
    expect(s2.ents.filter((e) => e.kind === 'unit' && e.owner === 0 && e.unit === 'kerengga').length).toBe(2);
  });
});
