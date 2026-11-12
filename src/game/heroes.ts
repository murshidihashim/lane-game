// Hero kits: what each hero's Trait, Power and Ultimate do (DEC-007). Text for players lives in
// rules.ts (HEROES); the numbers here must match it. Everything is whole-number maths.
import { dist2, idiv, isqrt, pct, within } from './math';
import { LANES, LANE_HALF, type LaneId, inJungle, laneDist2, pointAt, uToS } from './map';
import { CLASSES, HERO_RULES, MANA, type HeroKind, sec } from './rules';
import type { Ent, Player, Sim } from './sim';

export interface Kit {
  /** The Power. Called when its cooldown is ready; returns true if it fired. */
  power(sim: Sim, h: Ent, rank: 1 | 2 | 3): boolean;
  /**
   * The Ultimate (DEC-011). Returns true if now is a good moment. With go = false it only checks
   * (that lights the ULT button); with go = true it also fires. Fired only after the player calls it.
   */
  ult?(sim: Sim, h: Ent, go: boolean): boolean;
  /** How long the ultimate's effect lasts on the hero, for drawing (ticks). */
  ultLasts?: number;
  /** An always-on Ultimate applied once at level 4. */
  passiveUlt?(sim: Sim, h: Ent): void;
  onSpawn?(sim: Sim, h: Ent): void;
  /** Every tick while alive (auras). */
  tick?(sim: Sim, h: Ent): void;
  speedPct?(sim: Sim, h: Ent): number;
  /** Basic attack damage multiplier, in percent. */
  attackPct?(sim: Sim, h: Ent, t: Ent): number;
  /** After a basic attack lands. */
  onHit?(sim: Sim, h: Ent, t: Ent, dealt: number): void;
  /** After any damage from this hero lands. */
  onDealt?(sim: Sim, h: Ent, t: Ent, dmg: number): void;
  /** Change damage this hero takes. */
  incoming?(sim: Sim, h: Ent, dmg: number, src: Ent | null, spell: boolean, pure: boolean): number;
  /** Ultimate triggers tied to moments rather than checks (only once called). Return true if it fired. */
  onAmbush?(sim: Sim, h: Ent, t: Ent): boolean;
  onTeamGank?(sim: Sim, h: Ent, ganker: Ent): boolean;
  onLethal?(sim: Sim, h: Ent): boolean;
  /** Push order: don't walk further than this distance from your end of the lane. */
  pushLimit?(sim: Sim, h: Ent): number | undefined;
}

const me = (h: Ent) => h.homeOwner as Player;
const foe = (h: Ent) => (1 - me(h)) as Player;

/** Biggest (most max health) of a list. */
function biggest(list: Ent[]): Ent | undefined {
  let best: Ent | undefined;
  for (const e of list) if (!best || e.maxHp > best.maxHp || (e.maxHp === best.maxHp && e.id < best.id)) best = e;
  return best;
}

function nearestTower(sim: Sim, owner: Player, x: number, y: number, r: number, withCore = true): Ent | undefined {
  let best: Ent | undefined;
  let bestD = Infinity;
  for (const e of sim.ents) {
    if (!e.alive || e.owner !== owner || (e.kind !== 'tower' && !(withCore && e.kind === 'core'))) continue;
    const d = dist2(x, y, e.x, e.y);
    const rr = r + e.r;
    if (d <= rr * rr && d < bestD) { best = e; bestD = d; }
  }
  return best;
}

/** A unit's distance along its lane from player p's end. */
function uIn(sim: Sim, lane: LaneId, p: Player, e: Ent): number {
  return sim.uOf(lane, p, e.x, e.y);
}

function inLane(lane: LaneId, e: Ent, extra = 100): boolean {
  return laneDist2(LANES[lane], e.x, e.y) <= (LANE_HALF + extra) * (LANE_HALF + extra);
}

export const KITS: Record<HeroKind, Kit> = {
  // ---- Rimba: jungle ganker ----
  rimba: {
    speedPct: (sim, h) => (inJungle(h.x, h.y, sim.lanes) ? 130 : 100),
    power(sim, h, rank) {
      const targets = sim.foes(me(h), h.x, h.y, h.range).slice(0, rank === 1 ? 3 : 4);
      for (const t of targets) {
        sim.hurt(t, sim.scaled(h, 120), h);
        if (rank === 3) sim.slowFor(t, 70, sec(2));
        sim.fx({ k: 'hit', x1: h.x, y1: h.y, x2: t.x, y2: t.y, ranged: true, owner: h.owner });
      }
      return targets.length > 0;
    },
    onAmbush(sim, h, t) {
      sim.markFor(t, me(h), sec(6));
      sim.ultFx(h, t.x, t.y, 150);
      return true;
    },
  },

  // ---- Benteng: tower defender ----
  benteng: {
    incoming: (sim, h, dmg) => (nearestTower(sim, me(h), h.x, h.y, 900, false) ? pct(dmg, 70) : dmg),
    power(sim, h, rank) {
      const r = rank === 1 ? 320 : 400;
      const targets = sim.foes(me(h), h.x, h.y, r);
      if (!targets.length) return false;
      for (const t of targets) {
        sim.hurt(t, sim.scaled(h, 100), h);
        sim.slowFor(t, 60, sec(3));
        if (rank === 3) sim.stunFor(t, sec(0.5));
      }
      sim.fx({ k: 'boom', x: h.x, y: h.y, r, owner: h.owner });
      return true;
    },
    ult(sim, h, go) {
      const t = nearestTower(sim, me(h), h.x, h.y, 1200, true);
      if (!t || t.hp * 10 >= t.maxHp * 3) return false;
      if (!go) return true;
      sim.shieldFor(t, 1000, sec(8));
      sim.ultFx(h, t.x, t.y, 350);
      return true;
    },
  },

  // ---- Kail: hook initiator ----
  kail: {
    onHit: (sim, _h, t) => sim.slowFor(t, 80, sec(1)),
    power(sim, h, rank) {
      const reach = rank === 1 ? 700 : 850;
      const t = sim.foes(me(h), h.x, h.y, reach, { heroesOnly: true })[0] ?? biggest(sim.foes(me(h), h.x, h.y, reach, { unitsOnly: true }));
      if (!t) return false;
      const [x, y] = sim.beside(t, h, 10); // right in front of Kail
      sim.fx({ k: 'line', x1: h.x, y1: h.y, x2: t.x, y2: t.y, owner: h.owner });
      sim.place(t, x, y);
      sim.hurt(t, sim.scaled(h, 60), h);
      if (rank === 3) sim.stunFor(t, sec(1));
      return true;
    },
    ult(sim, h, go) {
      if (sim.foes(me(h), h.x, h.y, 600).length < 4) return false;
      if (!go) return true;
      const lane = sim.laneOf(h);
      for (const t of sim.foes(me(h), h.x, h.y, 1500)) {
        if (!inLane(lane, t, 200)) continue;
        sim.pushBack(t, 400);
        sim.slowFor(t, 60, sec(3));
      }
      sim.ultFx(h, h.x, h.y, 700);
      return true;
    },
  },

  // ---- Seri: vision support ----
  seri: {
    power(sim, h, rank) {
      const mine = sim.zones.filter((z) => z.kind === 'lantern' && z.owner === me(h));
      if (mine.length >= 2) sim.zones.splice(sim.zones.indexOf(mine[0]), 1);
      sim.addZone({ kind: 'lantern', owner: me(h), x: h.x, y: h.y, r: 900, lane: sim.laneOf(h), until: sim.tick + (rank === 1 ? sec(30) : sec(45)), heal: rank === 3 });
      return true;
    },
    ultLasts: sec(6),
    onTeamGank(sim, h) {
      for (const ally of sim.heroes(me(h))) if (ally.alive) ally.veil = sec(6);
      sim.ultFx(h, h.x, h.y, 600);
      return true;
    },
  },

  // ---- Belang: jungle carry (camp bonuses live in Sim.resolveDeaths) ----
  belang: {
    power(sim, h, rank) {
      const t = sim.foes(me(h), h.x, h.y, 500)[0];
      if (!t) return false;
      const [x, y] = sim.beside(h, t);
      sim.place(h, x, y);
      sim.hurt(t, sim.scaled(h, rank >= 2 ? 126 : 90), h);
      sim.stunFor(t, rank === 3 ? sec(1) : sec(0.5));
      return true;
    },
    passiveUlt(sim, h) {
      h.transformed = true;
      sim.ultFx(h, h.x, h.y, 300);
    },
    onHit(sim, h, t, dealt) {
      if (!h.transformed) return;
      for (const o of sim.foes(me(h), t.x, t.y, 200)) if (o.id !== t.id) sim.hurt(o, idiv(dealt, 2), h, false);
    },
  },

  // ---- Gergasi: buildings-only siege ----
  gergasi: {
    ultLasts: sec(8),
    attackPct: (_sim, _h, t) => (t.kind === 'tower' || t.kind === 'core' ? 300 : 100),
    tick(sim, h) {
      if (h.order.type !== 'defend') return;
      for (const t of sim.foes(me(h), h.x, h.y, 350, { unitsOnly: true })) sim.slowFor(t, 50, 2);
    },
    power(sim, h, rank) {
      const t = nearestTower(sim, foe(h), h.x, h.y, 1300, true);
      if (!t) return false;
      sim.fx({ k: 'line', x1: h.x, y1: h.y, x2: t.x, y2: t.y, owner: h.owner });
      sim.hurt(t, sim.scaled(h, rank === 1 ? 150 : 225), h, false);
      if (rank === 3) for (const o of sim.foes(me(h), t.x, t.y, 300, { unitsOnly: true })) sim.knockback(o, 250, t.x, t.y);
      return true;
    },
    ult(sim, h, go) {
      const t = nearestTower(sim, foe(h), h.x, h.y, h.range + h.r + 20, true);
      if (!t) return false;
      if (!go) return true;
      sim.hasteFor(h, 50, sec(8));
      h.splash = sec(8);
      sim.ultFx(h, h.x, h.y, 300, t.x, t.y);
      return true;
    },
    onHit(sim, h, t, dealt) {
      if (h.splash <= 0) return;
      for (const o of sim.foes(me(h), t.x, t.y, 250)) if (o.id !== t.id) sim.hurt(o, idiv(dealt, 2), h, false);
    },
  },

  // ---- Dalang: summoner ----
  dalang: {
    pushLimit(sim, h) {
      const p = me(h);
      const lane = h.lane;
      let front = -1;
      for (const e of sim.ents) {
        if (e.kind !== 'unit' || !e.alive || e.owner !== p || e.lane !== lane) continue;
        const u = uIn(sim, lane, p, e);
        if (u > front) front = u;
      }
      const river = idiv(LANES[lane].length, 2);
      return front >= 0 ? Math.max(front - 300, 0) : river - 200;
    },
    power(sim, h, rank) {
      const p = me(h);
      const lane = sim.laneOf(h);
      const s = sim.uOf(lane, p, h.x, h.y) + 200;
      const [x, y] = pointAt(LANES[lane], uToS(LANES[lane], p, s));
      const copy = rank === 3 ? CLASSES[sim.players[p].laneClass[lane]].unit : null;
      const n = rank === 1 ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const side = (i - 1) * 80;
        const kind = copy ?? 'puppet';
        sim.summon(p, kind, x + side, y, lane, { life: sec(20), hpPct: copy ? 50 : undefined });
      }
      return true;
    },
    ult(sim, h, go) {
      const t = sim.foes(me(h), h.x, h.y, 600, { unitsOnly: true }).find((e) => e.maxHp >= 1000 && e.charm === 0);
      if (!t) return false;
      if (!go) return true;
      sim.charmFor(t, me(h), sec(10));
      sim.say(t.x, t.y - 120, 'Taken!', 'ult');
      sim.ultFx(h, h.x, h.y, 150, t.x, t.y);
      return true;
    },
  },

  // ---- Senja: splash mage ----
  senja: {
    incoming: (_sim, _h, dmg, _src, spell) => (spell ? pct(dmg, 50) : dmg),
    power(sim, h, rank) {
      const r = rank === 1 ? 250 : 300;
      let best: Ent | undefined;
      let bestN = 0;
      for (const c of sim.foes(me(h), h.x, h.y, 600)) {
        const n = sim.foes(me(h), c.x, c.y, r).length;
        if (n > bestN) { best = c; bestN = n; }
      }
      if (!best || bestN < 3) return false;
      const [x, y] = [best.x, best.y];
      for (const t of sim.foes(me(h), x, y, r)) {
        sim.hurt(t, sim.scaled(h, 140), h);
        if (rank === 3) sim.stunFor(t, sec(0.5));
      }
      sim.fx({ k: 'boom', x, y, r, owner: h.owner });
      return true;
    },
    ult(sim, h, go) {
      const enemies = sim.heroes(foe(h)).filter((e) => e.alive && !e.hidden);
      if (enemies.length < 2) return false;
      if (!go) return true;
      for (const e of enemies) sim.silenceFor(e, sec(5));
      sim.ultFx(h, h.x, h.y, 2000);
      sim.players[foe(h)].manaSlow = sec(10);
      return true;
    },
  },

  // ---- Hujan: healer ----
  hujan: {
    tick(sim, h) {
      if (sim.tick % 20 !== 0) return;
      for (const a of sim.allies(me(h), h.x, h.y, 400)) sim.heal(a, pct(a.maxHp, 1));
    },
    power(sim, h, rank) {
      const near = sim.allies(me(h), h.x, h.y, 350);
      if (!near.some((a) => a.hp * 10 < a.maxHp * 8)) return false;
      for (const a of near) sim.heal(a, rank === 1 ? 150 : 220);
      if (rank === 3) for (const t of sim.ents) if (t.kind === 'tower' && t.alive && t.owner === me(h) && within(h.x, h.y, t.x, t.y, 600)) sim.heal(t, 100);
      sim.fx({ k: 'boom', x: h.x, y: h.y, r: 350, owner: h.owner });
      return true;
    },
    ult(sim, h, go) {
      const lane = sim.laneOf(h);
      const t = sim.towerOf(me(h), lane);
      if (!t || !t.alive || sim.foes(me(h), t.x, t.y, 900).length < 4) return false;
      if (!go) return true;
      sim.ultFx(h, t.x, t.y, 900);
      sim.addZone({ kind: 'flood', owner: me(h), x: t.x, y: t.y, r: 0, lane, until: sim.tick + sec(6), heal: false });
      return true;
    },
  },

  // ---- Layang: flying diver ----
  layang: {
    power(sim, h, rank) {
      const list = sim.foes(me(h), h.x, h.y, 600);
      if (!list.length) return false;
      let t = list[0];
      for (const e of list) if (e.hp < t.hp) t = e;
      const [ox, oy] = [h.x, h.y];
      const [x, y] = sim.beside(h, t);
      sim.place(h, x, y);
      sim.hurt(t, sim.scaled(h, rank === 1 ? 150 : 225), h);
      if (rank === 3) sim.place(h, ox, oy);
      return true;
    },
    onTeamGank(sim, h, ganker) {
      if (ganker.id !== h.id) return false;
      sim.updateGankGoal(h);
      const [ox, oy] = [h.x, h.y];
      sim.place(h, h.goalX, h.goalY);
      sim.ultFx(h, h.x, h.y, 300, ox, oy);
      for (const t of sim.foes(me(h), h.x, h.y, 300)) sim.stunFor(t, sec(1));
      return true;
    },
  },

  // ---- Pendekar: duelist ----
  pendekar: {
    incoming(sim, h, dmg, src, _spell, pure) {
      if (pure || !src || h.blockCd > 0) return dmg;
      h.blockCd = sec(4);
      sim.say(h.x, h.y - 120, 'Parry', 'info');
      return 0;
    },
    power(sim, h, rank) {
      const t = sim.foes(me(h), h.x, h.y, 600, { heroesOnly: true })[0] ?? biggest(sim.foes(me(h), h.x, h.y, 600, { unitsOnly: true }));
      if (!t) return false;
      const [x, y] = sim.beside(h, t);
      sim.place(h, x, y);
      sim.hurt(t, sim.scaled(h, rank === 3 ? 180 : 120), h);
      sim.silenceFor(t, rank === 1 ? sec(2) : sec(3));
      return true;
    },
    ult(sim, h, go) {
      const t = sim.foes(me(h), h.x, h.y, 400, { heroesOnly: true }).find((e) => !e.duelWith);
      if (!t || h.duelWith) return false;
      if (!go) return true;
      sim.startDuel(h, t, sec(4));
      sim.ultFx(h, h.x, h.y, 400, t.x, t.y);
      return true;
    },
  },

  // ---- Pelanduk: trickster ----
  pelanduk: {
    onSpawn: (_sim, h) => { h.lowPriority = true; },
    power(sim, h, rank) {
      const lane = sim.laneOf(h);
      const n = rank === 1 ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const d = sim.summon(me(h), 'decoy', h.x + (i - 1) * 90, h.y + (i % 2 ? 60 : -60), lane, { life: rank === 3 ? sec(6) : sec(4) });
        d.speed = h.speed;
      }
      return true;
    },
    onLethal(sim, h) {
      const p = me(h);
      const core = sim.coreOf(p);
      const [ox, oy] = [h.x, h.y];
      sim.place(h, core.x, core.y + (p === 0 ? -420 : 420));
      sim.ultFx(h, h.x, h.y, 200, ox, oy);
      h.hp = pct(h.maxHp, 30);
      h.targetId = 0;
      sim.say(h.x, h.y - 140, 'Escaped!', 'ult');
      return true;
    },
  },

  // ---- Saudagar: economy (the +10% refill lives in Sim.regenMana) ----
  saudagar: {
    power(sim, h, rank) {
      const pl = sim.players[me(h)];
      const gain = rank === 1 ? MANA.perMana : rank === 2 ? idiv(MANA.perMana * 3, 2) : MANA.perMana * 2;
      pl.mana = Math.min(MANA.max, pl.mana + gain);
      sim.say(h.x, h.y - 120, `+${rank === 2 ? '1.5' : rank === 1 ? '1' : '2'} ${MANA.name}`, 'mana');
      return true;
    },
    ult(sim, h, go) {
      if (!go) return true; // any time
      const pl = sim.players[me(h)];
      pl.mana = Math.min(MANA.max, pl.mana + 3 * MANA.perMana);
      pl.halfPrice = true;
      sim.say(h.x, h.y - 120, `+3 ${MANA.name}`, 'mana');
      sim.ultFx(h, h.x, h.y, 300);
      return true;
    },
  },

  // ---- Badak: charger ----
  badak: {
    incoming: (_sim, _h, dmg, src) => (src && (src.kind === 'tower' || src.kind === 'core') ? pct(dmg, 75) : dmg),
    power(sim, h, rank) {
      const t = sim.foes(me(h), h.x, h.y, 600)[0];
      if (!t || t.flying) return false;
      const [x, y] = sim.beside(h, t);
      sim.place(h, x, y);
      for (const o of sim.foes(me(h), t.x, t.y, 250)) {
        if (o.flying) continue;
        sim.hurt(o, sim.scaled(h, rank === 1 ? 100 : 150), h);
        sim.knockback(o, 200, h.x, h.y);
        sim.stunFor(o, rank === 3 ? sec(1) : sec(0.5));
      }
      sim.fx({ k: 'boom', x: t.x, y: t.y, r: 250, owner: h.owner });
      return true;
    },
    ult(sim, h, go) {
      const t = sim.towerOf(foe(h), sim.laneOf(h));
      if (!t || !t.alive || !within(h.x, h.y, t.x, t.y, 2000)) return false;
      if (!go) return true;
      const [ox, oy] = [h.x, h.y];
      const [x, y] = sim.beside(h, t, 10);
      sim.fx({ k: 'line', x1: h.x, y1: h.y, x2: x, y2: y, owner: h.owner });
      sim.place(h, x, y);
      sim.hurt(t, sim.scaled(h, 200), h, false);
      for (const o of sim.foes(me(h), t.x, t.y, 400)) sim.stunFor(o, sec(1.5));
      sim.ultFx(h, t.x, t.y, 400, ox, oy);
      return true;
    },
  },

  // ---- Tedung: poison assassin ----
  tedung: {
    onHit: (sim, h, t) => sim.dotFor(t, 2, 0, sec(3), me(h)),
    power(sim, h, rank) {
      const targets = sim.foes(me(h), h.x, h.y, 500).slice(0, rank === 1 ? 2 : 3);
      for (const t of targets) {
        sim.dotFor(t, rank === 3 ? 8 : 4, 0, sec(3), me(h));
        sim.slowFor(t, 70, sec(2));
        sim.fx({ k: 'hit', x1: h.x, y1: h.y, x2: t.x, y2: t.y, ranged: true, owner: h.owner });
      }
      return targets.length > 0;
    },
    ult(sim, h, go) {
      const t = sim.foes(me(h), h.x, h.y, 400, { heroesOnly: true }).find((e) => e.hp * 2 < e.maxHp);
      if (!t) return false;
      if (!go) return true;
      sim.stunFor(t, sec(2));
      sim.dotFor(t, 6, 0, sec(3), me(h));
      sim.ultFx(h, t.x, t.y, 200, h.x, h.y);
      return true;
    },
  },

  // ---- Tukang: builder ----
  tukang: {
    tick(sim, h) {
      if (sim.tick % 20 !== 0) return;
      for (const t of sim.ents) if (t.kind === 'tower' && t.alive && t.owner === me(h) && within(h.x, h.y, t.x, t.y, 700)) sim.heal(t, pct(t.maxHp, 1));
    },
    power(sim, h, rank) {
      const w = sim.summon(me(h), 'watchtower', h.x, h.y - (me(h) === 0 ? 80 : -80), sim.laneOf(h), { life: rank === 3 ? sec(30) : sec(20) });
      if (rank >= 2) { w.maxHp = 700; w.hp = 700; }
      return true;
    },
    ult(sim, h, go) {
      const towers = sim.ents.filter((t) => t.kind === 'tower' && t.alive && t.owner === me(h));
      if (!towers.some((t) => t.hp * 2 < t.maxHp)) return false;
      if (!go) return true;
      for (const t of towers) { sim.shieldFor(t, 600, sec(8)); sim.atkBuffFor(t, 70, sec(8)); }
      sim.ultFx(h, h.x, h.y, 300);
      return true;
    },
  },

  // ---- Helang: marksman ----
  helang: {
    ultLasts: sec(6),
    attackPct: (_sim, _h, t) => (t.kind === 'hero' ? 125 : 100),
    power(sim, h, rank) {
      const aim = sim.foes(me(h), h.x, h.y, 900)[0];
      if (!aim) return false;
      const dx = aim.x - h.x;
      const dy = aim.y - h.y;
      const d = Math.max(1, isqrt(dx * dx + dy * dy));
      const ex = h.x + idiv(dx * 900, d);
      const ey = h.y + idiv(dy * 900, d);
      for (const t of sim.foes(me(h), h.x, h.y, 900)) {
        // distance from t to the shot's line, using the cross product
        const along = (t.x - h.x) * dx + (t.y - h.y) * dy;
        if (along < 0) continue;
        const cross = Math.abs((t.x - h.x) * dy - (t.y - h.y) * dx);
        if (idiv(cross, d) > 120 + t.r) continue;
        sim.hurt(t, sim.scaled(h, rank === 1 ? 130 : 180), h);
        if (rank === 3) sim.slowFor(t, 60, sec(2));
      }
      sim.fx({ k: 'line', x1: h.x, y1: h.y, x2: ex, y2: ey, owner: h.owner });
      return true;
    },
    ult(sim, h, go) {
      if (sim.foes(me(h), h.x, h.y, h.range).length < 3) return false;
      if (!go) return true;
      sim.atkBuffFor(h, 50, sec(6));
      sim.ultFx(h, h.x, h.y, 700);
      return true;
    },
  },

  // ---- Embun: controller ----
  embun: {
    tick(sim, h) {
      for (const t of sim.foes(me(h), h.x, h.y, 400)) sim.slowFor(t, 85, 2);
    },
    power(sim, h, rank) {
      const list = sim.foes(me(h), h.x, h.y, 800);
      if (list.length < 2) return false;
      let best = list[0];
      let bestN = 0;
      for (const c of list) {
        const n = sim.foes(me(h), c.x, c.y, 300).length;
        if (n > bestN) { best = c; bestN = n; }
      }
      sim.addZone({ kind: 'fog', owner: me(h), x: best.x, y: best.y, r: rank === 3 ? 450 : 350, lane: sim.laneOf(best), until: sim.tick + (rank === 1 ? sec(6) : sec(8)), heal: false });
      return true;
    },
    ult(sim, h, go) {
      const list = sim.foes(me(h), h.x, h.y, 600);
      if (list.length < 5) return false;
      if (!go) return true;
      for (const t of list) sim.stunFor(t, sec(1.5));
      sim.ultFx(h, h.x, h.y, 600);
      return true;
    },
  },

  // ---- Ombak: lane pusher ----
  ombak: {
    ultLasts: sec(10),
    tick(sim, h) {
      const lane = sim.laneOf(h);
      for (const a of sim.allies(me(h), h.x, h.y, 1500, false)) if (a.lane === lane) sim.hasteFor(a, 15, 2);
    },
    power(sim, h, rank) {
      const p = me(h);
      const lane = sim.laneOf(h);
      const u0 = sim.uOf(lane, p, h.x, h.y);
      const hit = sim.foes(p, h.x, h.y, 1100).filter((t) => inLane(lane, t) && !t.flying && (() => { const u = uIn(sim, lane, p, t); return u >= u0 - 100 && u <= u0 + 900; })());
      if (!hit.length) return false;
      for (const t of hit) {
        sim.hurt(t, sim.scaled(h, rank === 1 ? 110 : 150), h);
        sim.pushBack(t, 250);
        if (rank === 3) sim.slowFor(t, 70, sec(2));
      }
      const [x2, y2] = pointAt(LANES[lane], uToS(LANES[lane], p, u0 + 900));
      sim.fx({ k: 'line', x1: h.x, y1: h.y, x2, y2, owner: h.owner });
      return true;
    },
    ult(sim, h, go) {
      const lane = sim.laneOf(h);
      const troops = sim.ents.filter((e) => e.kind === 'unit' && e.alive && e.owner === me(h) && e.lane === lane && within(h.x, h.y, e.x, e.y, 1500));
      if (troops.length < 3) return false;
      if (!go) return true;
      sim.ultFx(h, h.x, h.y, 900);
      sim.addZone({ kind: 'tide', owner: me(h), x: h.x, y: h.y, r: 0, lane, until: sim.tick + sec(10), heal: false });
      return true;
    },
  },

  // ---- Buaya: life-stealing bruiser ----
  buaya: {
    ultLasts: sec(8),
    onDealt: (sim, h, _t, dmg) => sim.heal(h, idiv(dmg, 5)),
    power(sim, h, rank) {
      const t = sim.foes(me(h), h.x, h.y, h.range + 100)[0];
      if (!t || t.flying) return false;
      sim.stunFor(t, sec(1.5));
      sim.dotFor(t, 0, rank === 1 ? 120 : rank === 2 ? 160 : 200, sec(1.5), me(h));
      h.stun = Math.max(h.stun, sec(1.5)); // it holds on while it drags
      return true;
    },
    ult(sim, h, go) {
      if (h.hp * 10 >= h.maxHp * 4) return false;
      if (!go) return true;
      h.immune = sec(8);
      h.stun = 0;
      h.slow = 0;
      h.silence = 0;
      sim.regenFor(h, 5, sec(8));
      sim.ultFx(h, h.x, h.y, 300);
      return true;
    },
  },
};

// Every hero in rules.ts must have a kit (checked at load).
export function missingKits(ids: readonly HeroKind[]): HeroKind[] {
  return ids.filter((id) => !KITS[id]);
}

export const ULT_LEVEL = HERO_RULES.ultLevel;
