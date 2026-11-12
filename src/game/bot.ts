// Rule-based computer opponent. It reads the match state and returns commands, like a player.
// It only uses what its side can see (hidden heroes in the jungle are ignored) and its own
// seeded random numbers, so a match with the same seed and the same human moves replays exactly.
import { Rng, idiv, within } from './math';
import { LANES, type LaneId, WARD_SPOTS, nearestS } from './map';
import { CLASS_CARDS, DEPLOY, HEROES, MANA, SPECIES, UNITS, type CardId, type ClassCardId, type HeroKind, type SpellCardId } from './rules';
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

/** Spells that hurt enemies (aim at an enemy group) and spells that help (aim at our group). */
const HARM: SpellCardId[] = ['firebolt', 'arus', 'sengat', 'gempa'];
const HELP: SpellCardId[] = ['gotong', 'auman'];

export class Bot {
  private rng: Rng;
  private nextThink = 0;
  private nextLaneThink = 60;
  private nextHeroThink: Partial<Record<HeroKind, number>> = {};
  private lastGank: Partial<Record<HeroKind, number>> = {};
  private lastErrand: Partial<Record<HeroKind, number>> = {};
  private supportLane: LaneId | -1 = -1;

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
    if (sim.tick < this.nextThink) return out;
    this.nextThink = sim.tick + (this.level === 'easy' ? 24 + this.rng.int(24) : 8 + this.rng.int(10));
    const c = this.playCard(sim);
    if (c) out.push(c);
    return out;
  }

  // ---------- reading the board ----------

  private u(lane: LaneId, x: number, y: number): number {
    const s = nearestS(LANES[lane], x, y);
    return this.player === 0 ? s : LANES[lane].length - s;
  }

  private value(e: Ent): number {
    const v = idiv(e.hp, 20) + e.damage;
    return e.wave ? idiv(v, 3) : v; // lane waves mostly cancel each other out
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
        if (!sim.visibleTo(e, me)) continue;
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

  private myClasses(sim: Sim): ClassCardId[] {
    return SPECIES[sim.players[this.player].species].classes;
  }

  /** Our class cards sorted for a job: tanks for defence, building-breakers then heavies for attack. */
  private ranked(sim: Sim, job: 'defend' | 'attack'): CardId[] {
    const list = [...this.myClasses(sim)];
    const st = (c: ClassCardId) => UNITS[CLASS_CARDS[c].unit as keyof typeof UNITS];
    if (job === 'defend') {
      return list.filter((c) => st(c).targets === 'any').sort((a, b) => st(b).hp * (CLASS_CARDS[b].count ?? 1) - st(a).hp * (CLASS_CARDS[a].count ?? 1));
    }
    return list.sort((a, b) => (st(b).targets === 'buildings' ? 1 : 0) - (st(a).targets === 'buildings' ? 1 : 0) || st(b).hp - st(a).hp);
  }

  private affordable(sim: Sim, prefs: readonly CardId[]): CardId | null {
    const hand = sim.players[this.player].hand;
    for (const c of prefs) if (hand.includes(c) && sim.canAfford(this.player, c)) return c;
    return null;
  }

  private place(sim: Sim, card: CardId, lane: LaneId, u: number): Command {
    const clamped = Math.max(DEPLOY.minU, Math.min(sim.maxU(this.player, lane), u));
    return { t: 'card', player: this.player, card, lane, u: clamped };
  }

  /** The best spot for a spell: the biggest group of enemies (harm) or of our own fighters (help). */
  private spellSpot(sim: Sim, ours: boolean): { x: number; y: number; n: number } | null {
    const me = this.player;
    const side = ours ? me : 1 - me;
    let best: { x: number; y: number; n: number } | null = null;
    for (const e of sim.ents) {
      if (!e.alive || e.hp <= 0 || e.owner !== side || (e.kind !== 'unit' && e.kind !== 'hero') || !sim.visibleTo(e, me) || e.wave) continue;
      let n = 0;
      for (const o of sim.ents) {
        if (o.alive && o.hp > 0 && o.owner === side && (o.kind === 'unit' || o.kind === 'hero') && within(e.x, e.y, o.x, o.y, 230)) n++;
      }
      if (ours && sim.foes(me, e.x, e.y, 500).length === 0) continue; // only help a fight
      if (!best || n > best.n) best = { x: e.x, y: e.y, n };
    }
    return best;
  }

  // ---------- lane waves (DEC-008) ----------

  private laneWaves(sim: Sim): Command | null {
    const views = this.lanes(sim);
    const pl = sim.players[this.player];
    const worst = [...views].sort((a, b) => (b.threat - b.defence) - (a.threat - a.defence) || a.lane - b.lane)[0];
    if (worst && worst.threat - worst.defence > 40) {
      const tank = this.ranked(sim, 'defend')[0] as ClassCardId | undefined;
      if (tank && pl.laneClass[worst.lane] !== tank) return { t: 'wave', player: this.player, lane: worst.lane, card: tank };
    }
    // Otherwise, now and then, try a different class in a random lane.
    if (this.level === 'normal' && this.rng.chance(40)) {
      const lane = sim.lanes[this.rng.int(sim.lanes.length)];
      const classes = this.myClasses(sim);
      const card = classes[this.rng.int(classes.length)];
      if (pl.laneClass[lane] !== card) return { t: 'wave', player: this.player, lane, card };
    }
    return null;
  }

  // ---------- cards ----------

  private playCard(sim: Sim): Command | null {
    const me = this.player;
    const pl = sim.players[me];
    const views = this.lanes(sim);

    // 1. Spells: hit an enemy group of 3+, or boost our fighters in a fight.
    for (const spell of HARM) {
      if (!pl.hand.includes(spell) || !sim.canAfford(me, spell)) continue;
      const spot = this.spellSpot(sim, false);
      if (spot && spot.n >= 3) return { t: 'spell', player: me, card: spell, x: spot.x, y: spot.y };
    }
    for (const spell of HELP) {
      if (!pl.hand.includes(spell) || !sim.canAfford(me, spell)) continue;
      const spot = this.spellSpot(sim, true);
      if (spot && spot.n >= 3) return { t: 'spell', player: me, card: spell, x: spot.x, y: spot.y };
    }

    // 2. Defend the lane under the most pressure.
    const worst = [...views].sort((a, b) => (b.threat - b.defence) - (a.threat - a.defence) || a.lane - b.lane)[0];
    if (worst && worst.threat - worst.defence > 45 && worst.front >= 0) {
      const card = this.affordable(sim, this.ranked(sim, 'defend'));
      if (card) return this.place(sim, card, worst.lane, worst.front - 350);
      return null; // save Semangat for defence
    }

    // 3. Bring out heroes once the match is under way.
    if (sim.tick > 200) {
      for (const hero of pl.picks) {
        if (pl.hand.includes(hero) && pl.mana >= (sim.costOf(me, hero) + 1) * MANA.perMana) {
          const defender = HEROES[hero].best === 'defend';
          const lane = defender && worst && worst.threat > 0 ? worst.lane : this.attackLane(sim, views);
          return this.place(sim, hero, lane, sim.maxU(me, lane) - 300);
        }
      }
    }

    // 4. Support a building-breaker that was just sent.
    if (this.supportLane !== -1) {
      const lane: LaneId = this.supportLane;
      const card = this.affordable(sim, this.ranked(sim, 'defend'));
      if (card) {
        this.supportLane = -1;
        return this.place(sim, card, lane, sim.maxU(me, lane) - 500);
      }
    }

    // 5. Attack when Semangat is high (or about to overflow).
    const threshold = this.level === 'easy' ? 9 : 7 + this.rng.int(3);
    if (pl.mana >= threshold * MANA.perMana) {
      const lane = this.attackLane(sim, views);
      const card = this.affordable(sim, this.ranked(sim, 'attack'));
      if (card) {
        if (CLASS_CARDS[card as ClassCardId]?.unit && UNITS[CLASS_CARDS[card as ClassCardId].unit as keyof typeof UNITS].targets === 'buildings') this.supportLane = lane;
        return this.place(sim, card, lane, sim.maxU(me, lane));
      }
    }
    return null;
  }

  private attackLane(sim: Sim, views: LaneView[]): LaneId {
    if (this.level === 'easy') return sim.lanes[this.rng.int(sim.lanes.length)];
    // Prefer a lane where we already push, then the weakest enemy tower, with a little randomness.
    let best = views[0];
    let bestScore = -Infinity;
    for (const v of views) {
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
