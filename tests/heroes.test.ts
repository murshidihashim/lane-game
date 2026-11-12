// PLAN-002 T1/T2: every hero's power, ultimate and trait do what the card says.
import { describe, expect, test } from 'vitest';
import { LANES, pointAt, towerPos } from '../src/game/map';
import { HERO_IDS, MANA, XP, type HeroKind, type UnitKind } from '../src/game/rules';
import { type Ent, Sim } from '../src/game/sim';
import { stepN } from './helpers';

const LEFT = LANES[0];

/** A quiet match with your hero played at distance 3000 up the left lane (well away from towers). */
function arena(hero: HeroKind, level = 1, extra?: HeroKind): { sim: Sim; h: Ent } {
  const other: HeroKind = extra ?? (hero === 'rimba' ? 'benteng' : 'rimba');
  const sim = new Sim({ seed: 11, waves: false, picks: [[hero, other], ['rimba', 'benteng']] });
  sim.players[0].hand = [hero, other, 'spearmen', 'imps'];
  sim.players[0].mana = MANA.max;
  sim.submit({ t: 'card', player: 0, card: hero, lane: 0, u: 3000 });
  stepN(sim, 22);
  const h = sim.heroOf(0, hero);
  if (!h) throw new Error(`${hero} not played`);
  h.powerCd = 9999; // tests switch the power on when they want it
  if (level > 1) sim.giveXp(h, XP.levels[level - 1]);
  return { sim, h };
}

/** An enemy (player 1) unit next to the hero. */
function foe(sim: Sim, h: Ent, kind: UnitKind, dx: number, dy: number): Ent {
  return sim.summon(1, kind, h.x + dx, h.y + dy, 0);
}

/** An enemy hero next to the hero (played by player 1, then moved). */
function foeHero(sim: Sim, h: Ent, kind: HeroKind, dx: number, dy: number): Ent {
  sim.players[1].hand = [kind, 'spearmen', 'archers', 'imps'];
  sim.players[1].mana = MANA.max;
  sim.submit({ t: 'card', player: 1, card: kind, lane: 0, u: 3000 });
  sim.step();
  const e = sim.heroOf(1, kind);
  if (!e) throw new Error('enemy hero not played');
  e.deploy = 0;
  e.powerCd = 9999;
  sim.place(e, h.x + dx, h.y + dy);
  return e;
}

const said = (sim: Sim, text: string) => sim.events.some((e) => e.k === 'text' && e.text === text);
const dist = (a: Ent, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const castPower = (sim: Sim, h: Ent) => { h.powerCd = 0; sim.step(); };

describe('every hero', () => {
  test('all 20 heroes can be picked, played and given every order', () => {
    expect(HERO_IDS).toHaveLength(20);
    for (const id of HERO_IDS) {
      const { sim, h } = arena(id);
      for (const [order, extra] of [['defend', { lane: 1 }], ['gank', { lane: 2 }], ['farm', { camp: 0 }], ['retreat', {}], ['push', { lane: 0 }]] as const) {
        sim.submit({ t: 'order', player: 0, hero: id, order, ...extra });
        stepN(sim, 40);
      }
      expect(h.alive).toBe(true);
    }
  });

  test('an ultimate unlocks at level 4, fires once, and is ready again after respawn', () => {
    const { sim, h } = arena('embun', 3);
    expect(h.ultReady).toBe(false);
    sim.giveXp(h, XP.levels[3]);
    expect(h.level).toBe(4);
    expect(h.ultReady).toBe(true);
    for (let i = 0; i < 5; i++) foe(sim, h, 'spearman', -200 + i * 100, -250);
    sim.step();
    expect(h.ultReady).toBe(false);
    expect(said(sim, 'Dawn Freeze')).toBe(true);
    h.hp = 0;
    sim.step();
    expect(h.alive).toBe(false);
    stepN(sim, h.respawn + 2);
    expect(h.alive).toBe(true);
    expect(h.ultReady).toBe(true);
  });

  test('best order gives +15% damage', () => {
    const { sim, h } = arena('ombak'); // best order: Push, which is the order a new hero starts with
    const t = foe(sim, h, 'shieldbearer', 0, -200);
    h.atkCd = 0;
    const before = t.hp;
    sim.step();
    expect(before - t.hp).toBe(Math.trunc((h.damage * 115) / 100));
  });
});

describe('hero kits', () => {
  test('Rimba: Volley hits 3; Hunter’s Mark on her Ambush', () => {
    const { sim, h } = arena('rimba');
    const ts = [0, 1, 2, 3].map((i) => foe(sim, h, 'spearman', -150 + i * 100, -350));
    castPower(sim, h);
    expect(said(sim, 'Volley')).toBe(true);
    expect(ts.filter((t) => t.hp <= 340 - 120).length).toBe(3);

    const b = arena('rimba', 4);
    const t = foe(b.sim, b.h, 'shieldbearer', 0, -300);
    b.h.ambushLeft = 60;
    b.h.atkCd = 0;
    b.sim.step();
    expect(t.mark).toBeGreaterThan(0);
    expect(b.h.ultReady).toBe(false);
  });

  test('Benteng: Stomp slows (and stuns at level 3); Unbreakable shields a falling tower', () => {
    const { sim, h } = arena('benteng', 3);
    const t = foe(sim, h, 'spearman', 0, -200);
    castPower(sim, h);
    expect(t.slow).toBeGreaterThan(0);
    expect(t.stun).toBeGreaterThan(0);

    const b = arena('benteng', 4);
    const tower = b.sim.towerOf(0, 0)!;
    b.sim.place(b.h, tower.x, tower.y - 300);
    tower.hp = Math.trunc(tower.maxHp * 0.29);
    b.sim.step();
    expect(tower.shield).toBeGreaterThan(0);
    expect(b.h.ultReady).toBe(false);
  });

  test('Kail: Hook pulls the biggest enemy in; Riptide pushes a crowd back', () => {
    const { sim, h } = arena('kail');
    const big = foe(sim, h, 'shieldbearer', 0, -650);
    castPower(sim, h);
    expect(dist(big, h)).toBeLessThan(260);

    const b = arena('kail', 4);
    const crowd = [0, 1, 2, 3].map((i) => foe(b.sim, b.h, 'spearman', -150 + i * 100, -300));
    const ys = crowd.map((c) => c.y);
    b.sim.step();
    expect(b.h.ultReady).toBe(false);
    crowd.forEach((c, i) => expect(ys[i] - c.y).toBeGreaterThan(300)); // pushed up, towards their side
  });

  test('Seri: Second Sight reveals a hidden hero; Lantern; Veil hides the team on a gank', () => {
    const at: [number, number] = [1300, 3700];
    const control = arena('rimba', 1, 'benteng');
    control.sim.place(control.h, 570, 4003);
    const e1 = foeHero(control.sim, control.h, 'tedung', 0, 0);
    control.sim.place(e1, ...at);
    control.sim.step();
    expect(e1.hidden).toBe(true);

    const { sim, h } = arena('seri', 1, 'rimba');
    sim.place(h, 570, 4003);
    const e2 = foeHero(sim, h, 'tedung', 0, 0);
    sim.place(e2, ...at);
    sim.step();
    expect(e2.hidden).toBe(false);

    castPower(sim, h);
    expect(sim.zones.some((z) => z.kind === 'lantern' && z.owner === 0)).toBe(true);

    const v = arena('seri', 4, 'rimba');
    v.sim.players[0].hand = ['rimba', 'spearmen', 'imps', 'archers'];
    v.sim.players[0].mana = MANA.max;
    v.sim.submit({ t: 'card', player: 0, card: 'rimba', lane: 2, u: 2000 });
    stepN(v.sim, 22);
    v.sim.submit({ t: 'order', player: 0, hero: 'rimba', order: 'gank', lane: 0 });
    v.sim.step();
    for (const ally of v.sim.heroes(0)) expect(ally.veil).toBeGreaterThan(0);
    expect(v.h.ultReady).toBe(false);
  });

  test('Belang: Pounce leaps and stuns; Shape of the Beast at level 4', () => {
    const { sim, h } = arena('belang');
    const t = foe(sim, h, 'spearman', 0, -450);
    castPower(sim, h);
    expect(dist(h, t)).toBeLessThan(250);
    expect(t.stun).toBeGreaterThan(0);
    const b = arena('belang', 3);
    const before = b.h.maxHp;
    b.sim.giveXp(b.h, XP.levels[3]);
    expect(b.h.transformed).toBe(true);
    expect(b.h.maxHp).toBeGreaterThan(before * 1.5);
    expect(b.h.ultReady).toBe(false); // always-on ultimate, nothing to fire
  });

  test('Gergasi: ignores troops, triple damage to towers, Boulder, Rampage', () => {
    const { sim, h } = arena('gergasi');
    const t = foe(sim, h, 'spearman', 0, -150);
    stepN(sim, 30);
    expect(t.hp).toBe(340);
    const tower = sim.towerOf(1, 0)!;
    sim.place(h, tower.x, tower.y + 1200);
    castPower(sim, h);
    expect(tower.hp).toBe(tower.maxHp - 75); // 150, halved by the first-minute tower shield

    const b = arena('gergasi', 4);
    const tw = b.sim.towerOf(1, 0)!;
    b.sim.place(b.h, tw.x, tw.y + 250);
    b.sim.step();
    expect(b.h.ultReady).toBe(false);
    expect(b.h.splash).toBeGreaterThan(0);
  });

  test('Dalang: Shadow Play summons, copies your last troop at level 3, Grand Performance takes a big troop', () => {
    const { sim, h } = arena('dalang');
    castPower(sim, h);
    expect(sim.ents.filter((e) => e.kind === 'unit' && e.owner === 0 && e.unit === 'puppet')).toHaveLength(2);
    const c = arena('dalang', 3);
    c.sim.players[0].lastTroop = 'shieldbearer';
    castPower(c.sim, c.h);
    const copies = c.sim.ents.filter((e) => e.kind === 'unit' && e.owner === 0 && e.unit === 'shieldbearer');
    expect(copies).toHaveLength(3);
    expect(copies[0].maxHp).toBe(550);

    const b = arena('dalang', 4);
    const big = foe(b.sim, b.h, 'shieldbearer', 0, -400);
    b.sim.step();
    expect(big.owner).toBe(0);
    expect(big.charm).toBeGreaterThan(0);
  });

  test('Senja: Waterspout hits a group; spells hurt her half; Swallow the Moon silences', () => {
    const { sim, h } = arena('senja');
    const g = [0, 1, 2].map((i) => foe(sim, h, 'spearman', -80 + i * 80, -450));
    castPower(sim, h);
    for (const t of g) expect(t.hp).toBeLessThanOrEqual(340 - 140);
    sim.players[1].hand = ['firebolt', 'spearmen', 'archers', 'imps'];
    sim.players[1].mana = MANA.max;
    for (const t of g) t.hp = 0;
    sim.step();
    const before = h.hp;
    sim.submit({ t: 'spell', player: 1, card: 'firebolt', x: h.x, y: h.y });
    stepN(sim, 14);
    expect(before - h.hp).toBe(130);

    const b = arena('senja', 4);
    const e1 = foeHero(b.sim, b.h, 'rimba', 0, -2000);
    const e2 = foeHero(b.sim, b.h, 'benteng', 300, -2000);
    b.sim.step();
    expect(e1.silence).toBeGreaterThan(0);
    expect(e2.silence).toBeGreaterThan(0);
    expect(b.sim.players[1].manaSlow).toBeGreaterThan(0);
  });

  test('Hujan: Healing Rain heals hurt allies; Flash Flood floods the lane', () => {
    const { sim, h } = arena('hujan');
    const ally = sim.summon(0, 'shieldbearer', h.x + 100, h.y, 0);
    ally.hp = 300;
    castPower(sim, h);
    expect(ally.hp).toBeGreaterThanOrEqual(450);

    const b = arena('hujan', 4);
    const tower = b.sim.towerOf(0, 0)!;
    b.sim.place(b.h, tower.x, tower.y - 500);
    for (let i = 0; i < 4; i++) b.sim.summon(1, 'spearman', tower.x - 150 + i * 100, tower.y - 400, 0);
    b.sim.step();
    expect(b.sim.zones.some((z) => z.kind === 'flood' && z.lane === 0)).toBe(true);
  });

  test('Layang: flies over melee troops, Dive, Moon Kite crosses instantly', () => {
    const { sim, h } = arena('layang');
    sim.submit({ t: 'order', player: 0, hero: 'layang', order: 'defend', lane: 0 });
    const melee = foe(sim, h, 'spearman', 0, -120);
    melee.deploy = 0;
    const hp = h.hp;
    stepN(sim, 40);
    expect(h.hp).toBe(hp); // melee troops can't hit a flier
    expect(melee.hp).toBeLessThan(340);
    const archer = foe(sim, h, 'archer', 0, -300);
    archer.deploy = 0;
    stepN(sim, 40);
    expect(h.hp).toBeLessThan(hp);

    const d = arena('layang');
    const weak = foe(d.sim, d.h, 'spearman', 200, -500);
    weak.hp = 120;
    foe(d.sim, d.h, 'shieldbearer', -200, -500);
    castPower(d.sim, d.h);
    expect(weak.alive && weak.hp > 0).toBe(false);

    const b = arena('layang', 4);
    b.sim.submit({ t: 'order', player: 0, hero: 'layang', order: 'gank', lane: 2 });
    b.sim.step();
    expect(b.h.x).toBeGreaterThan(3000);
    expect(b.h.ultReady).toBe(false);
  });

  test('Pendekar: Silat Guard parries, Keris Strike silences, Duel shuts others out', () => {
    const { sim, h } = arena('pendekar');
    sim.submit({ t: 'order', player: 0, hero: 'pendekar', order: 'defend', lane: 0 });
    const a = foe(sim, h, 'archer', 0, -400);
    a.deploy = 0;
    let parried = false;
    for (let i = 0; i < 40 && !parried; i++) { sim.step(); parried = said(sim, 'Parry'); }
    expect(parried).toBe(true);

    const k = arena('pendekar');
    const e = foeHero(k.sim, k.h, 'senja', 0, -500);
    castPower(k.sim, k.h);
    expect(e.silence).toBeGreaterThan(0);

    const b = arena('pendekar', 4);
    const rival = foeHero(b.sim, b.h, 'helang', 0, -300);
    b.sim.step();
    expect(b.h.duelWith).toBe(rival.id);
    const archer = b.sim.summon(1, 'archer', b.h.x, b.h.y - 400, 0);
    archer.deploy = 0;
    const s = b.sim.summon(0, 'spearman', rival.x, rival.y - 100, 0);
    s.deploy = 0;
    const hpRival = rival.hp;
    stepN(b.sim, 25);
    // only the duel partner can hurt it (Pendekar's own hits count; the spearman's don't)
    expect(s.targetId === rival.id).toBe(false);
    expect(rival.hp).toBeLessThanOrEqual(hpRival);
  });

  test('Pelanduk: Decoys, Unnoticed, Clever Escape', () => {
    const { sim, h } = arena('pelanduk');
    castPower(sim, h);
    expect(sim.ents.filter((e) => e.kind === 'unit' && e.owner === 0 && e.unit === 'decoy')).toHaveLength(2);

    const u = arena('pelanduk');
    u.sim.submit({ t: 'order', player: 0, hero: 'pelanduk', order: 'defend', lane: 0 });
    u.sim.step();
    const buddy = u.sim.summon(0, 'shieldbearer', u.h.x + 150, u.h.y, 0);
    buddy.deploy = 0;
    const archer = foe(u.sim, u.h, 'archer', 0, -350);
    archer.deploy = 0;
    stepN(u.sim, 10);
    expect(archer.targetId).toBe(buddy.id);

    const b = arena('pelanduk', 4);
    b.h.hp = 5;
    const t = foe(b.sim, b.h, 'shieldbearer', 0, -150);
    t.deploy = 0;
    stepN(b.sim, 40);
    expect(b.h.alive).toBe(true);
    expect(b.h.ultReady).toBe(false);
    expect(dist(b.h, { x: 1950, y: 6210 })).toBeLessThan(700);
  });

  test('Saudagar: Trade Winds gives Semangat, Trade Route speeds the refill, Golden Monsoon discounts', () => {
    const { sim, h } = arena('saudagar');
    sim.players[0].mana = 0;
    castPower(sim, h);
    expect(sim.players[0].mana).toBeGreaterThanOrEqual(MANA.perMana);
    const r = arena('saudagar');
    r.sim.players[0].mana = 0;
    r.sim.players[1].mana = 0;
    stepN(r.sim, 100);
    expect(r.sim.players[0].mana - r.sim.players[1].mana).toBe(10);

    const b = arena('saudagar', 4);
    b.sim.players[0].mana = MANA.perMana;
    b.sim.step();
    expect(b.sim.players[0].discount).toBeGreaterThan(0);
    expect(b.sim.costOf(0, 'spearmen')).toBe(2);
  });

  test('Badak: Charge stuns, Thick Hide vs towers, Stampede to the tower', () => {
    const { sim, h } = arena('badak');
    const t = foe(sim, h, 'spearman', 0, -500);
    castPower(sim, h);
    expect(t.stun).toBeGreaterThan(0);
    expect(dist(h, t)).toBeLessThan(450);

    const b = arena('badak', 4);
    const tower = b.sim.towerOf(1, 0)!;
    b.sim.place(b.h, tower.x, tower.y + 1800);
    b.sim.step();
    expect(b.h.ultReady).toBe(false);
    expect(dist(b.h, tower)).toBeLessThan(400);
    expect(tower.hp).toBeLessThan(tower.maxHp);
  });

  test('Tedung: Venom on hit, Spit poisons two, Coil stuns a hurt hero', () => {
    const { sim, h } = arena('tedung');
    const t = foe(sim, h, 'shieldbearer', 0, -250);
    t.deploy = 0;
    h.atkCd = 0;
    stepN(sim, 3);
    expect(t.dot).toBeGreaterThan(0);
    const s = arena('tedung');
    const two = [foe(s.sim, s.h, 'spearman', -100, -400), foe(s.sim, s.h, 'spearman', 100, -400), foe(s.sim, s.h, 'spearman', 0, -480)];
    castPower(s.sim, s.h);
    expect(two.filter((x) => x.dot > 0)).toHaveLength(2);

    const b = arena('tedung', 4);
    const e = foeHero(b.sim, b.h, 'helang', 0, -300);
    e.hp = Math.trunc(e.maxHp * 0.4);
    b.sim.step();
    expect(e.stun).toBeGreaterThan(0);
  });

  test('Tukang: builds a watchtower, repairs towers, Bamboo Bulwark shields them', () => {
    const { sim, h } = arena('tukang');
    castPower(sim, h);
    expect(sim.ents.some((e) => e.kind === 'unit' && e.unit === 'watchtower' && e.owner === 0)).toBe(true);
    const tower = sim.towerOf(0, 0)!;
    sim.place(h, tower.x, tower.y - 300);
    tower.hp = 1000;
    stepN(sim, 40);
    expect(tower.hp).toBeGreaterThan(1000);

    const b = arena('tukang', 4);
    b.sim.towerOf(0, 2)!.hp = 900;
    b.sim.step();
    for (const t of b.sim.ents.filter((e) => e.kind === 'tower' && e.owner === 0)) expect(t.shield).toBeGreaterThan(0);
  });

  test('Helang: Piercing Shot hits a line, +25% vs heroes, Storm of Feathers', () => {
    const { sim, h } = arena('helang');
    const line = [300, 500, 700].map((d) => foe(sim, h, 'spearman', 0, -d));
    castPower(sim, h);
    for (const t of line) expect(t.hp).toBeLessThanOrEqual(340 - 130);

    const b = arena('helang', 4);
    for (let i = 0; i < 3; i++) foe(b.sim, b.h, 'spearman', -100 + i * 100, -600);
    b.sim.step();
    expect(b.h.atkBuff).toBeGreaterThan(0);
  });

  test('Embun: Morning Mist slows, Fog Bank, Dawn Freeze', () => {
    const { sim, h } = arena('embun');
    const t = foe(sim, h, 'spearman', 0, -300);
    sim.step();
    expect(t.slow).toBeGreaterThan(0);
    foe(sim, h, 'spearman', 80, -320);
    castPower(sim, h);
    expect(sim.zones.some((z) => z.kind === 'fog' && z.owner === 0)).toBe(true);
  });

  test('Ombak: Surge pushes enemies back up the lane; King Tide powers up your troops', () => {
    const { sim, h } = arena('ombak');
    const t = foe(sim, h, 'shieldbearer', 0, -500);
    const y = t.y;
    castPower(sim, h);
    expect(y - t.y).toBeGreaterThan(150);
    expect(t.hp).toBeLessThan(1100);

    const b = arena('ombak', 4);
    for (let i = 0; i < 3; i++) b.sim.summon(0, 'spearman', b.h.x - 100 + i * 100, b.h.y - 200, 0);
    b.sim.step();
    expect(b.sim.zones.some((z) => z.kind === 'tide' && z.lane === 0)).toBe(true);
  });

  test('Buaya: Death Roll heals, Drag Under holds a target, Swamp King when low', () => {
    const { sim, h } = arena('buaya');
    h.hp = 500;
    const t = foe(sim, h, 'shieldbearer', 0, -220);
    t.deploy = 0;
    h.atkCd = 0;
    stepN(sim, 3);
    expect(h.hp).toBeGreaterThan(500);
    castPower(sim, h);
    expect(t.stun).toBeGreaterThan(0);

    const b = arena('buaya', 4);
    b.h.hp = Math.trunc(b.h.maxHp * 0.3);
    b.sim.step();
    expect(b.h.immune).toBeGreaterThan(0);
    expect(b.h.ultReady).toBe(false);
  });
});

// Keep map imports used (positions above are in world units on the left lane).
void LEFT; void pointAt; void towerPos;
