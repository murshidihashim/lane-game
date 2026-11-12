// Rule-based computer opponent. It reads the match state and returns commands, like a player:
// lane troops, hero orders, items and ultimate calls (DEC-011). It only uses what its side can see
// through the fog of war (DEC-012) and its own seeded random numbers, so a match with the same seed
// and the same human moves replays exactly.
import { Rng, idiv, within } from './math';
import { LANES, type LaneId, WARD_SPOTS, nearestS } from './map';
import { CLASSES, HEROES, MANA, SPECIES, UNITS, type ClassId, type HeroKind, type ItemId } from './rules';
import type { Command, Ent, Player, Sim } from './sim';

export type BotLevel = 'easy' | 'normal';

interface LaneView {
  lane: LaneId;
  threat: number; // enemy value on my half
  defence: number; // my value on my half
  push: number; // my value on their half
  front: number; // smallest u (closest to my Core) of an enemy on my half, or -1
  enemyTowerHp: number; // 0 if destroyed
  hasSiege: boolean; // an enemy that only hits buildings is coming
}

/** What to buy, by the kind of hero: front-liners, damage dealers and the rest. */
const TANKY: readonly HeroKind[] = ['benteng', 'gergasi', 'badak', 'buaya', 'belang', 'pendekar'];
const DAMAGE: readonly HeroKind[] = ['helang', 'senja', 'rimba', 'tedung', 'layang', 'kail'];
const SHOPPING: Record<'tank' | 'damage' | 'other', ItemId[]> = {
  tank: ['baju', 'rotan', 'keris', 'gelang', 'jamu'],
  damage: ['keris', 'gelang', 'capal', 'tangkal', 'baju'],
  other: ['tangkal', 'jamu', 'pelita', 'baju', 'capal'],
};

export class Bot {
  private rng: Rng;
  private nextShop = 100;
  private nextLaneThink = 60;
  private ultSeen: Partial<Record<HeroKind, number>> = {};
  private nextHeroThink: Partial<Record<HeroKind, number>> = {};
  private lastGank: Partial<Record<HeroKind, number>> = {};
  private lastErrand: Partial<Record<HeroKind, number>> = {};

  constructor(readonly player: Player, seed: number, readonly level: BotLevel = 'normal') {
    this.rng = new Rng((seed ^ (player === 0 ? 0x9e3779b9 : 0x7f4a7c15)) >>> 0);
  }

  think(sim: Sim): Command[] {
    if (sim.result) return [];
    const out: Command[] = [];
    for (const kind of sim.players[this.player].picks) {
      if (sim.tick >= (this.nextHeroThink[kind] ?? 0)) {
        const c = this.heroOrder(sim, kind);
        if (c) out.push(c);
        this.nextHeroThink[kind] = sim.tick + 30 + this.rng.int(30);
      }
    }
    if (sim.tick >= this.nextLaneThink) {
      const c = this.laneWaves(sim);
      if (c) out.push(c);
      this.nextLaneThink = sim.tick + 200 + this.rng.int(200);
    }
    for (const kind of sim.players[this.player].picks) {
      const c = this.callUlt(sim, kind);
      if (c) out.push(c);
    }
    if (sim.tick >= this.nextShop) {
      const c = this.shop(sim);
      if (c) out.push(c);
      this.nextShop = sim.tick + (this.level === 'easy' ? 300 + this.rng.int(200) : 60 + this.rng.int(60));
    }
    return out;
  }

  // ---------- items and ultimates (DEC-011) ----------

  private shop(sim: Sim): Command | null {
    const me = this.player;
    // The hero with fewer items shops first.
    const heroes = sim.players[me].picks.map((k) => sim.heroOf(me, k)).filter((h): h is Ent => !!h)
      .sort((a, b) => a.items.length - b.items.length || a.id - b.id);
    for (const h of heroes) {
      const kind = h.hero as HeroKind;
      const list = SHOPPING[TANKY.includes(kind) ? 'tank' : DAMAGE.includes(kind) ? 'damage' : 'other'];
      const item = list.find((i) => !h.items.includes(i));
      if (!item) continue;
      // Keep a little in hand early on; spend freely later.
      const reserve = sim.tick < 1200 ? 0 : 1;
      if (sim.manaOf(me) >= (sim.itemCost(me, item) + reserve) * MANA.perMana && !sim.cantBuy(me, kind, item)) {
        return { t: 'buy', player: me, hero: kind, item };
      }
      return null; // save up for this one
    }
    return null;
  }

  /** Call an ultimate once the game suggests it, after a human-like pause. */
  private callUlt(sim: Sim, kind: HeroKind): Command | null {
    const me = this.player;
    const h = sim.heroOf(me, kind);
    if (!h || !h.alive || h.ultArmed || !sim.ultSuggested(h)) { delete this.ultSeen[kind]; return null; }
    const seen = this.ultSeen[kind] ?? (this.ultSeen[kind] = sim.tick);
    const pause = this.level === 'easy' ? 60 : 10;
    if (sim.tick - seen < pause) return null;
    delete this.ultSeen[kind];
    return { t: 'ult', player: me, hero: kind };
  }

  // ---------- reading the board ----------

  private u(lane: LaneId, x: number, y: number): number {
    const s = nearestS(LANES[lane], x, y);
    return this.player === 0 ? s : LANES[lane].length - s;
  }

  private value(e: Ent): number {
    return idiv(e.hp, 20) + e.damage;
  }

  private lanes(sim: Sim): LaneView[] {
    const me = this.player;
    return sim.lanes.map((id) => {
      const half = idiv(LANES[id].length, 2);
      const v: LaneView = { lane: id, threat: 0, defence: 0, push: 0, front: -1, enemyTowerHp: 0, hasSiege: false };
      const et = sim.towerOf((1 - me) as Player, id);
      v.enemyTowerHp = et && et.alive ? et.hp : 0;
      for (const e of sim.ents) {
        if (!e.alive || e.hp <= 0 || (e.kind !== 'unit' && e.kind !== 'hero')) continue;
        if (!sim.sees(me, e)) continue;
        const lane = e.kind === 'unit' ? e.lane : sim.heroLane(e);
        if (lane !== id) continue;
        const u = this.u(id, e.x, e.y);
        if (e.owner === me) {
          if (u <= half + 300) v.defence += this.value(e);
          else v.push += this.value(e);
        } else if (u <= half + 300) {
          v.threat += this.value(e);
          if (v.front < 0 || u < v.front) v.front = u;
          if (e.targets === 'buildings') v.hasSiege = true;
        }
      }
      return v;
    });
  }

  private myClasses(sim: Sim): ClassId[] {
    return SPECIES[sim.players[this.player].species].classes;
  }

  /** Our classes sorted for a job: the toughest wave for defence. */
  private ranked(sim: Sim): ClassId[] {
    const st = (c: ClassId) => UNITS[CLASSES[c].unit];
    return this.myClasses(sim).filter((c) => st(c).targets === 'any').sort((a, b) => st(b).hp * CLASSES[b].wave - st(a).hp * CLASSES[a].wave);
  }

  // ---------- lane waves (DEC-008) ----------

  private laneWaves(sim: Sim): Command | null {
    const views = this.lanes(sim);
    const pl = sim.players[this.player];
    const worst = [...views].sort((a, b) => (b.threat - b.defence) - (a.threat - a.defence) || a.lane - b.lane)[0];
    if (worst && worst.threat - worst.defence > 40) {
      const tank = this.ranked(sim)[0] as ClassId | undefined;
      if (tank && pl.laneClass[worst.lane] !== tank) return { t: 'wave', player: this.player, lane: worst.lane, card: tank };
    }
    // Otherwise, now and then, try a different class in a random lane. Building-breakers (which
    // ignore enemy troops) only go to a lane we are winning, while its enemy tower still stands.
    if (this.level === 'normal' && this.rng.chance(40)) {
      const v = views[this.rng.int(views.length)];
      const winning = v.push > v.threat && v.enemyTowerHp > 0;
      const classes = this.myClasses(sim).filter((c) => winning || UNITS[CLASSES[c].unit].targets === 'any');
      const card = classes[this.rng.int(classes.length)];
      if (card && pl.laneClass[v.lane] !== card) return { t: 'wave', player: this.player, lane: v.lane, card };
    }
    // A lane left with building-breakers while losing gets a fighting class back.
    for (const v of views) {
      const cls = pl.laneClass[v.lane];
      if (UNITS[CLASSES[cls].unit].targets === 'buildings' && v.threat > v.push) {
        const fighter = this.ranked(sim)[0];
        if (fighter) return { t: 'wave', player: this.player, lane: v.lane, card: fighter };
      }
    }
    return null;
  }

  private attackLane(sim: Sim, views: LaneView[]): LaneId {
    if (this.level === 'easy') return sim.lanes[this.rng.int(sim.lanes.length)];
    // Prefer a lane where we already push, then the weakest enemy tower, with a little randomness.
    // In sudden death the next tower wins, so the weakest standing tower is all that matters.
    let best = views[0];
    let bestScore = -Infinity;
    const sudden = sim.phase() === 'sudden';
    for (const v of views) {
      if (sudden) {
        const score = v.enemyTowerHp > 0 ? 10_000 - v.enemyTowerHp : -1;
        if (score > bestScore) { best = v; bestScore = score; }
        continue;
      }
      const towerScore = v.enemyTowerHp === 0 ? 1500 : 2600 - v.enemyTowerHp;
      const score = v.push * 4 + towerScore + this.rng.int(600) - v.threat * 2;
      if (score > bestScore) { best = v; bestScore = score; }
    }
    return best.lane;
  }

  // ---------- heroes ----------

  /** A map errand for a quiet moment: relic, den, boss or ward (DEC-009). */
  private errand(sim: Sim, kind: HeroKind, h: Ent): Command | null {
    const me = this.player;
    if (sim.tick - (this.lastErrand[kind] ?? -10_000) < 400) return null;
    const best = HEROES[kind].best;
    const order = (c: Omit<Extract<Command, { t: 'order' }>, 't' | 'player' | 'hero'>): Command => {
      this.lastErrand[kind] = sim.tick;
      return { t: 'order', player: me, hero: kind, ...c };
    };
    // A relic close by.
    const relic = sim.relics().find((r) => within(h.x, h.y, r.x, r.y, 1600));
    if (relic) return order({ order: 'farm', target: relic.id });
    if (h.targets !== 'any') return null; // Gergasi can't fight camps
    // The boss, when strong enough.
    const boss = sim.camps()[4];
    if (boss && boss.alive && h.level >= 3 && h.hp * 10 > h.maxHp * 7 && this.rng.chance(50)) return order({ order: 'farm', camp: 4 });
    // Our den, for Jungle Fury.
    const den = sim.camps()[2 + me];
    if (den && den.alive && (best === 'farm' || best === 'gank') && this.rng.chance(60)) return order({ order: 'farm', camp: 2 + me });
    // A ward on our half, for supports and defenders.
    if ((best === 'defend' || best === 'farm') && this.rng.chance(50)) {
      const spots = [0, 1, 2].map((i) => i + me * 3);
      const free = spots.filter((i) => !sim.wards(me).some((w) => w.spot === i));
      if (free.length) {
        let pick = free[0];
        let bestD = Infinity;
        for (const i of free) {
          const [x, y] = WARD_SPOTS[i];
          const d = (x - h.x) * (x - h.x) + (y - h.y) * (y - h.y);
          if (d < bestD) { bestD = d; pick = i; }
        }
        return order({ order: 'ward', spot: pick });
      }
    }
    return null;
  }

  private heroOrder(sim: Sim, kind: HeroKind): Command | null {
    const me = this.player;
    const h = sim.heroOf(me, kind);
    if (!h || !h.alive || h.deploy > 0) return null;
    const views = this.lanes(sim);
    const order = (o: Command & { t: 'order' }): Command | null =>
      o.order === h.order.type && (o.lane === undefined || o.lane === h.order.lane) ? null : o;

    if (h.order.type === 'retreat') {
      if (h.hp * 10 < h.maxHp * 9) return null; // heal up first
      const lane = this.attackLane(sim, views);
      return order({ t: 'order', player: me, hero: kind, order: sim.heroLane(h) === lane ? 'push' : 'gank', lane });
    }
    if (h.hp * 10 < h.maxHp * 3) return order({ t: 'order', player: me, hero: kind, order: 'retreat' });

    const danger = [...views].sort((a, b) => (b.threat - b.defence) - (a.threat - a.defence) || a.lane - b.lane)[0];
    const current = sim.heroLane(h);
    const best = HEROES[kind].best;
    const goPush = (lane: LaneId) => order({ t: 'order', player: me, hero: kind, order: current === lane ? 'push' : 'gank', lane });

    // Sudden death: the next tower wins, so everyone goes for the weakest enemy tower.
    if (sim.phase() === 'sudden') {
      if (h.order.type === 'gank') return null;
      return goPush(this.attackLane(sim, views));
    }

    if (best === 'defend' && danger && danger.threat > 30) {
      const tower = sim.towerOf(me, danger.lane);
      if (tower && tower.alive) return order({ t: 'order', player: me, hero: kind, order: 'defend', lane: danger.lane });
    }

    if (h.order.type === 'gank' || h.order.type === 'farm' || h.order.type === 'ward') return null;

    if (best === 'gank' && sim.tick - (this.lastGank[kind] ?? -10_000) > 300) {
      const target = views
        .filter((v) => v.lane !== current && (v.threat > 20 || v.push > 20))
        .sort((a, b) => b.threat + b.push - (a.threat + a.push) || a.lane - b.lane)[0];
      if (target) {
        this.lastGank[kind] = sim.tick;
        return { t: 'order', player: me, hero: kind, order: 'gank', lane: target.lane };
      }
    }

    const quiet = views.every((v) => v.threat < 15);
    if (quiet) {
      const e = this.errand(sim, kind, h);
      if (e) return e;
    }
    if (best === 'push' || best === 'defend') return goPush(this.attackLane(sim, views));
    return order({ t: 'order', player: me, hero: kind, order: 'push', lane: current });
  }
}
