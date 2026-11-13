// PLAN-015 (DEC-023, DEC-024): aimed ultimates, warning rings, the dodge dash, Power on cue, combo
// chains, rallied waves, level-up choices and commander calls.
import { describe, expect, test } from 'vitest';
import { Bot } from '../src/game/bot';
import { KITS } from '../src/game/heroes';
import { BOSS_PIT, LANES, WARD_SPOTS, pointAt, uToS } from '../src/game/map';
import {
  ACTION, CALLS, CALL_RULES, HEROES, HERO_IDS, MANA, NEUTRALS, RALLY, ULT_AIMS, UPGRADES, WAVES, XP,
  type CallId, type HeroKind, type UnitKind,
} from '../src/game/rules';
import { type Ent, Sim } from '../src/game/sim';
import { heroOnLane, parkHeroes, stepN } from './helpers';

/** A quiet match (no waves) with your hero 3000 up the left lane; everyone else at home. */
function arena(hero: HeroKind, level = 1, foes: HeroKind[] = ['rimba', 'benteng', 'kail'], calls?: CallId[]): { sim: Sim; h: Ent } {
  const theirs = foes.filter((k) => k !== hero);
  const mine: HeroKind[] = [hero];
  for (const k of HERO_IDS) if (mine.length < 3 && !mine.includes(k) && !theirs.includes(k)) mine.push(k);
  for (const k of HERO_IDS) if (theirs.length < 3 && !mine.includes(k) && !theirs.includes(k)) theirs.push(k);
  const sim = new Sim({ seed: 11, waves: false, picks: [mine, theirs], calls: calls ? [calls, ['drum', 'remedy']] : undefined });
  parkHeroes(sim, 0, hero);
  parkHeroes(sim, 1);
  const h = heroOnLane(sim, 0, hero, 0, 3000);
  stepN(sim, 22);
  h.powerCd = 9999;
  if (level > 1) sim.giveXp(h, XP.levels[level - 1]);
  return { sim, h };
}

function foe(sim: Sim, h: Ent, kind: UnitKind, dx: number, dy: number): Ent {
  return sim.summon(1, kind, h.x + dx, h.y + dy, 0);
}

function foeHero(sim: Sim, h: Ent, kind: HeroKind, dx: number, dy: number): Ent {
  const e = heroOnLane(sim, 1, kind, 0, 3000);
  e.deploy = 0;
  e.powerCd = 9999;
  sim.place(e, h.x + dx, h.y + dy);
  return e;
}

const said = (sim: Sim, text: string) => sim.events.some((e) => e.k === 'text' && e.text === text);

describe('aimed ultimates (PLAN-015 T1)', () => {
  test('11 ultimates take an aim, each with an aimed version in its kit; the rest stay one tap', () => {
    const aimed = Object.keys(ULT_AIMS) as HeroKind[];
    expect(aimed.sort()).toEqual(['badak', 'benteng', 'dalang', 'embun', 'hujan', 'kail', 'layang', 'ombak', 'pendekar', 'rimba', 'tedung']);
    for (const k of aimed) expect(KITS[k].ultAt).toBeTypeOf('function');
    for (const k of HERO_IDS.filter((x) => !aimed.includes(x))) expect(KITS[k].ultAt).toBeUndefined();
  });

  test('Rimba marks an enemy she can see within reach at once; one out of reach is refused', () => {
    const { sim, h } = arena('rimba', 4);
    const near = foe(sim, h, 'spearman', 0, -600);
    const far = foe(sim, h, 'spearman', 0, -1400);
    sim.submit({ t: 'ult', player: 0, hero: 'rimba', target: far.id });
    sim.step();
    expect(h.ultReady).toBe(true);
    expect(far.mark).toBe(0);
    sim.submit({ t: 'ult', player: 0, hero: 'rimba', target: near.id });
    sim.step();
    expect(h.ultReady).toBe(false);
    expect(near.mark).toBeGreaterThan(0);
  });

  test('Benteng shields any of his towers, however far', () => {
    const { sim } = arena('benteng', 4);
    const t = sim.towerOf(0, 2)!;
    sim.submit({ t: 'ult', player: 0, hero: 'benteng', target: t.id });
    sim.step();
    expect(t.shield).toBe(1000);
  });

  test('Hujan floods the lane she aims at, not just her own', () => {
    const { sim } = arena('hujan', 4);
    const [x, y] = pointAt(LANES[2], 3000);
    sim.submit({ t: 'ult', player: 0, hero: 'hujan', x, y });
    sim.step();
    expect(sim.zones.some((z) => z.kind === 'flood' && z.lane === 2)).toBe(true);
  });

  test('Tedung aimed at a healthy hero still coils it (no health limit when aimed)', () => {
    const { sim, h } = arena('tedung', 4);
    const e = foeHero(sim, h, 'kail', 0, -300);
    sim.submit({ t: 'ult', player: 0, hero: 'tedung', target: e.id });
    sim.step();
    expect(h.ultReady).toBe(false);
    stepN(sim, ACTION.lockTicks + 1);
    expect(e.stun).toBeGreaterThan(0);
  });

  test('a plain tap still calls the ultimate for the next good moment', () => {
    const { sim, h } = arena('embun', 4);
    sim.submit({ t: 'ult', player: 0, hero: 'embun' });
    sim.step();
    expect(h.ultArmed).toBe(true);
    expect(h.ultReady).toBe(true);
  });

  test('a one-tap ultimate cannot be aimed', () => {
    const { sim, h } = arena('helang', 4);
    sim.submit({ t: 'ult', player: 0, hero: 'helang', x: h.x, y: h.y - 300 });
    sim.step();
    expect(h.ultReady).toBe(true);
  });
});

describe('warning rings (PLAN-015 T2)', () => {
  test('Dawn Freeze aimed at a spot: a ring for 1 s, then everything inside freezes', () => {
    const { sim, h } = arena('embun', 4);
    const [x, y] = [h.x, h.y - 600];
    const inside = foe(sim, h, 'spearman', 0, -600);
    inside.speed = 0;
    sim.submit({ t: 'ult', player: 0, hero: 'embun', x, y });
    sim.step();
    const c = sim.casts.find((k) => k.hero === 'embun')!;
    expect(c.r).toBe(500);
    expect(c.at - c.start).toBe(ACTION.ringTicks);
    expect(inside.stun).toBe(0);
    stepN(sim, ACTION.ringTicks);
    expect(inside.stun).toBeGreaterThan(0);
    expect(sim.casts).toHaveLength(0);
  });

  test('Duel locks on after a short ring and misses a hero that got away', () => {
    const { sim, h } = arena('pendekar', 4);
    const e = foeHero(sim, h, 'kail', 0, -350);
    sim.submit({ t: 'ult', player: 0, hero: 'pendekar', target: e.id });
    sim.step();
    expect(sim.casts.some((c) => c.target === e.id)).toBe(true);
    sim.place(e, h.x, h.y - 1500); // it ran
    let dodged = false;
    for (let i = 0; i <= ACTION.lockTicks; i++) { sim.step(); dodged ||= said(sim, 'Dodged!'); }
    expect(dodged).toBe(true);
    expect(h.duelWith).toBe(0);
    expect(h.ultReady).toBe(false); // spent all the same
  });

  test('a ring fizzles if its caster falls before it lands', () => {
    const { sim, h } = arena('embun', 4);
    const inside = foe(sim, h, 'spearman', 0, -500);
    inside.speed = 0;
    sim.submit({ t: 'ult', player: 0, hero: 'embun', x: h.x, y: h.y - 500 });
    sim.step();
    h.hp = 0;
    stepN(sim, ACTION.ringTicks + 1);
    expect(inside.stun).toBe(0);
  });

  test('Gajah Mina slams with a warning ring once fought: heroes left inside are hurt and stunned', () => {
    const { sim, h } = arena('benteng', 2);
    stepN(sim, NEUTRALS.boss.first);
    const boss = sim.camps()[4];
    expect(boss.alive).toBe(true);
    sim.place(h, BOSS_PIT[0], BOSS_PIT[1] + 250);
    sim.submit({ t: 'order', player: 0, hero: 'benteng', order: 'farm', camp: 4 });
    let ring = false;
    for (let i = 0; i < ACTION.slamEvery + 40 && !ring; i++) { sim.step(); ring = sim.casts.some((c) => c.hero === null); }
    expect(ring).toBe(true);
    const hp = h.hp;
    stepN(sim, ACTION.ringTicks + 1);
    expect(h.stun).toBeGreaterThan(0);
    expect(h.hp).toBeLessThan(hp);
  });
});

describe('dodge dash (PLAN-015 T3)', () => {
  test('a dash slides the hero about 400 towards the point, then waits 10 s', () => {
    const { sim, h } = arena('kail');
    const [x0, y0] = [h.x, h.y];
    sim.submit({ t: 'dash', player: 0, hero: 'kail', x: h.x + 1000, y: h.y });
    stepN(sim, ACTION.dashTicks + 1);
    expect(h.x - x0).toBeGreaterThan(ACTION.dashDist - 40);
    expect(Math.abs(h.y - y0)).toBeLessThan(40);
    expect(h.dashCd).toBeGreaterThan(0);
    const x1 = h.x;
    sim.submit({ t: 'dash', player: 0, hero: 'kail', x: h.x + 1000, y: h.y });
    stepN(sim, ACTION.dashTicks + 1);
    expect(Math.abs(h.x - x1)).toBeLessThan(60); // still cooling down
    stepN(sim, ACTION.dashCooldown);
    sim.submit({ t: 'dash', player: 0, hero: 'kail', x: h.x - 1000, y: h.y });
    stepN(sim, ACTION.dashTicks + 1);
    expect(x1 - h.x).toBeGreaterThan(200);
  });

  test('a stunned hero cannot dash', () => {
    const { sim, h } = arena('kail');
    sim.stunFor(h, 40);
    const x0 = h.x;
    sim.submit({ t: 'dash', player: 0, hero: 'kail', x: h.x + 1000, y: h.y });
    stepN(sim, ACTION.dashTicks + 1);
    expect(h.x).toBe(x0);
  });

  test('dashing out of a ring before it lands escapes it', () => {
    const { sim, h } = arena('embun', 4, ['kail', 'rimba', 'benteng']);
    // the ring (radius 500) is centred 500 up the lane: one enemy stands near its edge, one in the middle
    const e = foeHero(sim, h, 'kail', 0, -800);
    const stay = foeHero(sim, h, 'rimba', 0, -500);
    for (const x of [e, stay]) { x.order = { ...x.order, type: 'move', x: x.x, y: x.y }; }
    sim.submit({ t: 'ult', player: 0, hero: 'embun', x: h.x, y: h.y - 500 });
    sim.step();
    sim.submit({ t: 'dash', player: 1, hero: 'kail', x: e.x, y: e.y - 2000 });
    stepN(sim, ACTION.ringTicks + 1);
    expect(e.stun).toBe(0);
    expect(stay.stun).toBeGreaterThan(0);
  });

  test('the bot dashes its heroes out of rings it can see (most of the time)', () => {
    let dashes = 0;
    for (let n = 0; n < 10; n++) {
      const { sim, h } = arena('embun', 4, ['kail', 'rimba', 'benteng']);
      const e = foeHero(sim, h, 'kail', 0, -500);
      sim.casts.push({ id: 1000 + n * 7, hero: 'embun', caster: h.id, owner: 0, x: e.x, y: e.y, r: 500, target: 0, reach: 0, start: sim.tick - 5, at: sim.tick + 15 });
      const bot = new Bot(1, n);
      if (bot.think(sim).some((c) => c.t === 'dash' && c.hero === 'kail')) dashes++;
    }
    expect(dashes).toBeGreaterThanOrEqual(5);
    expect(dashes).toBeLessThan(10); // not perfect
  });
});

describe('Power on cue (PLAN-015 T4)', () => {
  test('a ready Power fired on cue hits 20% harder than one that fires by itself', () => {
    const dealt = (cue: boolean): number => {
      const { sim, h } = arena('rimba');
      const t = foe(sim, h, 'spearman', 0, -300);
      t.speed = 0;
      t.damage = 0;
      h.damage = 0; // only the Power counts here
      const hp = t.hp;
      h.powerCd = 1; // comes off cooldown on the next step
      sim.step();
      if (cue) { sim.submit({ t: 'power', player: 0, hero: 'rimba' }); sim.step(); }
      else stepN(sim, ACTION.autoDelay + 2);
      return hp - t.hp;
    };
    const auto = dealt(false);
    const cued = dealt(true);
    expect(auto).toBeGreaterThan(0);
    expect(cued).toBe(Math.trunc((auto * ACTION.cuePct) / 100));
  });

  test('left alone, a ready Power still fires by itself after a short wait', () => {
    const { sim, h } = arena('rimba');
    foe(sim, h, 'spearman', 0, -300).speed = 0;
    h.powerCd = 1;
    sim.step();
    stepN(sim, ACTION.autoDelay - 2);
    expect(h.powerCd).toBe(0); // still waiting for a cue
    stepN(sim, 4);
    expect(h.powerCd).toBeGreaterThan(0);
  });

  test('a cue on cooldown, or with nothing to hit, does nothing', () => {
    const { sim, h } = arena('rimba');
    sim.submit({ t: 'power', player: 0, hero: 'rimba' });
    sim.step();
    expect(h.powerCd).toBeGreaterThan(9000);
    h.powerCd = 0;
    sim.submit({ t: 'power', player: 0, hero: 'rimba' }); // nobody in range
    sim.step();
    expect(h.powerCd).toBe(0);
  });
});

describe('combo chains (PLAN-015 T5)', () => {
  test('spell hits from different heroes within 2 s chain: +15%, then +30%; one hero alone does not', () => {
    const { sim } = arena('rimba');
    const [a, b, c] = sim.heroes(0);
    const t = sim.summon(1, 'spearman', 2000, 3000, 0);
    t.speed = 0;
    t.hp = t.maxHp = 100000;
    const hit = (src: Ent) => { const before = t.hp; sim.hurt(t, 100, src); return before - t.hp; };
    const base = hit(a);
    expect(hit(a)).toBe(base); // same hero: no combo
    expect(hit(b)).toBe(Math.trunc((base * 115) / 100));
    expect(sim.events.some((e) => e.k === 'combo' && e.step === 1)).toBe(true);
    expect(hit(c)).toBe(Math.trunc((base * 130) / 100));
    expect(hit(a)).toBe(Math.trunc((base * 130) / 100)); // capped at two steps
    stepN(sim, ACTION.comboWindow + 1);
    expect(hit(b)).toBe(base); // too late: the chain is broken
  });

  test('basic attacks do not chain', () => {
    const { sim } = arena('rimba');
    const [a, b] = sim.heroes(0);
    const t = sim.summon(1, 'shieldbearer', 2000, 3000, 0);
    const before = t.hp;
    sim.hurt(t, 100, a, false);
    sim.hurt(t, 100, b, false);
    expect(t.comboStep).toBe(0);
    expect(before - t.hp).toBeGreaterThan(0);
  });
});

describe('rally the waves (PLAN-015 T6)', () => {
  const quiet = () => {
    const sim = new Sim({ seed: 5, species: ['kampung', 'kampung'] });
    parkHeroes(sim, 0);
    parkHeroes(sim, 1);
    return sim;
  };

  test('held waves wait at your end; released, they march together with a boost', () => {
    const sim = quiet();
    sim.submit({ t: 'rally', player: 0, lane: 0, hold: true });
    stepN(sim, WAVES.first + WAVES.every + 2);
    const held = sim.ents.filter((e) => e.kind === 'unit' && e.owner === 0 && e.lane === 0 && e.alive);
    expect(sim.players[0].held[0]).toBe(2);
    expect(held.length).toBeGreaterThan(0);
    expect(held.every((e) => e.held)).toBe(true);
    const lane = LANES[0];
    const home = pointAt(lane, uToS(lane, 0, WAVES.spawnU));
    for (const e of held) expect(Math.hypot(e.x - home[0], e.y - home[1])).toBeLessThan(RALLY.leash);
    // the other lanes march as usual
    expect(sim.ents.some((e) => e.kind === 'unit' && e.owner === 0 && e.lane === 1 && !e.held)).toBe(true);
    sim.submit({ t: 'rally', player: 0, lane: 0, hold: false });
    sim.step();
    expect(held.every((e) => !e.held && e.haste > 0 && e.dmgBuff > 0)).toBe(true);
    expect(sim.players[0].held[0]).toBe(0);
    stepN(sim, 120);
    for (const e of held) expect(Math.hypot(e.x - home[0], e.y - home[1])).toBeGreaterThan(RALLY.leash); // marching up the lane
  });

  test('the fourth wave releases a full rally by itself', () => {
    const sim = quiet();
    sim.submit({ t: 'rally', player: 0, lane: 2, hold: true });
    stepN(sim, WAVES.first + WAVES.every * 2 + 2);
    expect(sim.players[0].held[2]).toBe(RALLY.max);
    stepN(sim, WAVES.every);
    expect(sim.players[0].hold[2]).toBe(false);
    expect(sim.ents.some((e) => e.kind === 'unit' && e.owner === 0 && e.lane === 2 && e.held)).toBe(false);
  });

  test('the enemy cannot see a rally build up without vision there', () => {
    const sim = quiet();
    sim.submit({ t: 'rally', player: 0, lane: 1, hold: true });
    stepN(sim, WAVES.first + 2);
    const held = sim.ents.filter((e) => e.kind === 'unit' && e.owner === 0 && e.lane === 1 && e.held);
    expect(held.length).toBeGreaterThan(0);
    expect(held.some((e) => sim.sees(1, e))).toBe(false);
  });
});

describe('level-up choices (PLAN-015 T7)', () => {
  test('at level 2 a choice waits; Quick shortens the Power cooldown instead of the hero’s own upgrade', () => {
    const { sim, h } = arena('rimba', 2);
    expect(sim.pendingChoice(h)).toBe(2);
    sim.submit({ t: 'pick', player: 0, hero: 'rimba', option: 1 });
    sim.step();
    expect(sim.pendingChoice(h)).toBe(0);
    expect(sim.rank(h)).toBe(1); // Volley still hits 3, not 4
    expect(sim.powerCooldown(h)).toBe(Math.trunc((HEROES.rimba.powerTicks * UPGRADES.quickPct) / 100));
  });

  test('at level 3 Strong makes the Power 30% stronger; the hero’s own upgrade raises its rank', () => {
    const strong = arena('rimba', 3);
    strong.sim.submit({ t: 'pick', player: 0, hero: 'rimba', option: 0 });
    strong.sim.step();
    strong.sim.submit({ t: 'pick', player: 0, hero: 'rimba', option: 1 });
    strong.sim.step();
    expect(strong.h.upg).toEqual([0, 1]);
    expect(strong.sim.rank(strong.h)).toBe(2);
    strong.h.inPower = true;
    const s = strong.sim.scaled(strong.h, 100);
    strong.h.inPower = false;
    expect(s).toBe(Math.trunc((strong.sim.scaled(strong.h, 100) * UPGRADES.strongPct) / 100));
    const own = arena('rimba', 3);
    own.sim.submit({ t: 'pick', player: 0, hero: 'rimba', option: 0 });
    own.sim.step();
    own.sim.submit({ t: 'pick', player: 0, hero: 'rimba', option: 0 });
    own.sim.step();
    expect(own.sim.rank(own.h)).toBe(3);
  });

  test('a choice not made in 8 s is made for you: the hero’s own upgrade', () => {
    const { sim, h } = arena('rimba', 2);
    stepN(sim, UPGRADES.window + 2);
    expect(h.upg[0]).toBe(0);
    expect(sim.pendingChoice(h)).toBe(0);
    expect(sim.rank(h)).toBe(2);
  });
});

describe('commander calls (DEC-024, PLAN-015 T8)', () => {
  test('two calls picked before the match; War Drum and Penawar by default; six to choose from', () => {
    expect(Object.keys(CALLS)).toHaveLength(6);
    expect(new Sim({ seed: 1 }).players[0].calls).toEqual(['drum', 'remedy']);
    const sim = new Sim({ seed: 1, calls: [['eye', 'snare'], ['eye', 'eye', 'repair']] });
    expect(sim.players[0].calls).toEqual(['eye', 'snare']);
    expect(sim.players[1].calls).toEqual(['eye', 'repair']); // no repeats
  });

  test('a call costs Semangat and then cools down; a call you did not pick, or cannot pay for, is refused', () => {
    const { sim } = arena('kail', 1, undefined, ['drum', 'remedy']);
    const pl = sim.players[0];
    pl.mana = 10 * MANA.perMana;
    sim.submit({ t: 'call', player: 0, call: 'drum' });
    sim.step();
    expect(Math.trunc(pl.mana / MANA.perMana)).toBe(10 - CALLS.drum.cost);
    expect(pl.callCd[0]).toBeGreaterThan(0);
    const m = pl.mana;
    sim.submit({ t: 'call', player: 0, call: 'drum' });
    sim.submit({ t: 'call', player: 0, call: 'eye', x: 2000, y: 2000 });
    sim.step();
    expect(pl.mana).toBeGreaterThanOrEqual(m); // nothing spent
    pl.mana = 0;
    sim.submit({ t: 'call', player: 0, call: 'remedy' });
    sim.step();
    expect(pl.callCd[1]).toBe(0);
  });

  test('War Drum speeds up and strengthens all your troops', () => {
    const { sim, h } = arena('kail', 1, undefined, ['drum', 'remedy']);
    const u = sim.summon(0, 'spearman', h.x, h.y + 200, 0);
    sim.submit({ t: 'call', player: 0, call: 'drum' });
    sim.step();
    expect(u.haste).toBeGreaterThan(0);
    expect(u.dmgBuffPct).toBe(CALL_RULES.drumDmgPct);
  });

  test('Penawar heals your heroes 25% and clears slows and poison', () => {
    const { sim, h } = arena('kail', 1, undefined, ['drum', 'remedy']);
    h.hp = 100;
    sim.slowFor(h, 50, 100);
    sim.dotFor(h, 5, 0, 100, 1);
    sim.submit({ t: 'call', player: 0, call: 'remedy' });
    sim.step();
    expect(h.hp).toBeGreaterThanOrEqual(100 + Math.trunc((h.maxHp * CALL_RULES.remedyPct) / 100) - 20);
    expect(h.slow).toBe(0);
    expect(h.dot).toBe(0);
  });

  test('Bamboo Barricade: a wall on a lane you can see that enemy troops must break; never in the dark', () => {
    const { sim, h } = arena('kail', 1, undefined, ['barricade', 'eye']);
    sim.players[0].mana = 10 * MANA.perMana;
    sim.submit({ t: 'call', player: 0, call: 'barricade', x: 3000, y: 1200 }); // deep in the enemy's half: unseen
    sim.step();
    expect(sim.ents.some((e) => e.kind === 'wall')).toBe(false);
    const [x, y] = [h.x, h.y - 300];
    sim.submit({ t: 'call', player: 0, call: 'barricade', x, y });
    sim.step();
    const w = sim.ents.find((e) => e.kind === 'wall')!;
    expect(w.hp).toBe(CALL_RULES.wallHp);
    const u = sim.summon(1, 'spearman', x, y - 300, 0);
    let hitWall = false;
    for (let i = 0; i < 80; i++) { sim.step(); if (u.targetId === w.id) hitWall = true; }
    expect(hitWall).toBe(true);
    expect(w.hp).toBeLessThan(CALL_RULES.wallHp);
    stepN(sim, CALL_RULES.wallLife);
    expect(sim.ents.some((e) => e.kind === 'wall')).toBe(false); // gone after 12 s
  });

  test('Spirit Eye sees a far spot for 8 s, hidden heroes too', () => {
    const { sim, h } = arena('kail', 1, ['rimba', 'benteng', 'tedung'], ['eye', 'snare']);
    const e = foeHero(sim, h, 'rimba', 0, 0);
    sim.place(e, WARD_SPOTS[3][0], WARD_SPOTS[3][1]); // in the enemy's jungle
    stepN(sim, 2);
    expect(sim.sees(0, e)).toBe(false);
    sim.submit({ t: 'call', player: 0, call: 'eye', x: e.x, y: e.y });
    stepN(sim, 2);
    expect(sim.sees(0, e)).toBe(true);
    stepN(sim, CALL_RULES.eyeTicks);
    expect(sim.sees(0, e)).toBe(false);
  });

  test('Snare Trap catches the first enemy hero to step in: stunned and seen', () => {
    const { sim, h } = arena('kail', 1, ['rimba', 'benteng', 'tedung'], ['snare', 'eye']);
    const [x, y] = [h.x, h.y - 400];
    sim.submit({ t: 'call', player: 0, call: 'snare', x, y });
    sim.step();
    expect(sim.zones.some((z) => z.kind === 'snare')).toBe(true);
    const e = foeHero(sim, h, 'benteng', 0, -400);
    sim.step();
    expect(e.stun).toBeGreaterThan(0);
    expect(e.seen).toBeGreaterThan(0);
    expect(sim.zones.some((z) => z.kind === 'snare' && z.until > sim.tick)).toBe(false); // used up
  });

  test('Fort Repair restores 500 to a hurt tower, not to a whole one', () => {
    const { sim } = arena('kail', 1, undefined, ['repair', 'eye']);
    const t = sim.towerOf(0, 0)!;
    sim.submit({ t: 'call', player: 0, call: 'repair', target: t.id });
    sim.step();
    expect(sim.players[0].callCd[0]).toBe(0); // refused: full health
    t.hp = 600;
    sim.submit({ t: 'call', player: 0, call: 'repair', target: t.id });
    sim.step();
    expect(t.hp).toBe(600 + CALL_RULES.repairHp);
  });

  test('the bot picks up and uses its calls in a match', () => {
    const sim = new Sim({ seed: 3, calls: [['drum', 'remedy'], ['drum', 'repair']] });
    const bot = new Bot(1, 3);
    let used = false;
    for (let i = 0; i < 4000 && !used && !sim.result; i++) {
      for (const c of bot.think(sim)) sim.submit(c);
      sim.step();
      used = sim.events.some((e) => e.k === 'call' && e.owner === 1);
    }
    expect(used).toBe(true);
  });
});

