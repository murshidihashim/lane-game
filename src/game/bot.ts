// Rule-based computer opponent. It reads the match state and returns commands, like a player.
// It only uses what its side can see (hidden heroes in the jungle are ignored) and its own
// seeded random numbers, so a match with the same seed and the same human moves replays exactly.
import { Rng, idiv, within } from './math';
import { CAMPS, LANES, type LaneId, nearestS } from './map';
import { CARDS, DEPLOY, MANA, type CardId, type HeroKind } from './rules';
import type { Command, Ent, Player, Sim } from './sim';

export type BotLevel = 'easy' | 'normal';

interface LaneView {
  lane: LaneId;
  threat: number; // enemy value on my half
  defence: number; // my value on my half
  push: number; // my value on their half
  front: number; // smallest u (closest to my Core) of an enemy on my half, or -1
  enemyTowerHp: number; // 0 if destroyed
  hasRam: boolean;
}

const DEFENDERS: CardId[] = ['shieldbearer', 'spearmen', 'archers', 'imps'];
const ATTACKERS: CardId[] = ['ram', 'spearmen', 'shieldbearer', 'archers', 'imps'];

export class Bot {
  private rng: Rng;
  private nextThink = 0;
  private nextHeroThink: Record<HeroKind, number> = { ranger: 0, warden: 0 };
  private lastGank = -10_000;
  private supportLane: LaneId | -1 = -1;

  constructor(readonly player: Player, seed: number, readonly level: BotLevel = 'normal') {
    this.rng = new Rng((seed ^ (player === 0 ? 0x9e3779b9 : 0x7f4a7c15)) >>> 0);
  }

  think(sim: Sim): Command[] {
    if (sim.result) return [];
    const out: Command[] = [];
    for (const kind of ['ranger', 'warden'] as const) {
      if (sim.tick >= this.nextHeroThink[kind]) {
        const c = this.heroOrder(sim, kind);
        if (c) out.push(c);
        this.nextHeroThink[kind] = sim.tick + 30 + this.rng.int(30);
      }
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
    return e.unit === 'minion' ? idiv(v, 3) : v; // minion waves mostly cancel each other out
  }

  private lanes(sim: Sim): LaneView[] {
    const me = this.player;
    return sim.lanes.map((id) => {
      const half = idiv(LANES[id].length, 2);
      const v: LaneView = { lane: id, threat: 0, defence: 0, push: 0, front: -1, enemyTowerHp: 0, hasRam: false };
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
          if (e.unit === 'ram') v.hasRam = true;
        }
      }
      return v;
    });
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

  // ---------- cards ----------

  private playCard(sim: Sim): Command | null {
    const me = this.player;
    const pl = sim.players[me];
    const views = this.lanes(sim);

    // 1. Firebolt a cluster of 3+ visible enemies.
    if (pl.hand.includes('firebolt') && sim.canAfford(me, 'firebolt')) {
      let best: Ent | null = null;
      let bestCount = 0;
      for (const e of sim.ents) {
        if (!e.alive || e.hp <= 0 || e.owner !== 1 - me || (e.kind !== 'unit' && e.kind !== 'hero') || !sim.visibleTo(e, me)) continue;
        let n = 0;
        let big = 0; // troops and heroes (minion-only clusters are not worth a Firebolt)
        for (const o of sim.ents) {
          if (o.alive && o.hp > 0 && o.owner === 1 - me && (o.kind === 'unit' || o.kind === 'hero') && within(e.x, e.y, o.x, o.y, 230)) {
            n++;
            if (o.unit !== 'minion') big++;
          }
        }
        if (big < 2) continue;
        if (n > bestCount) { best = e; bestCount = n; }
      }
      if (best && bestCount >= 3) return { t: 'spell', player: me, card: 'firebolt', x: best.x, y: best.y };
    }

    // 2. Defend the lane under the most pressure.
    const worst = [...views].sort((a, b) => (b.threat - b.defence) - (a.threat - a.defence) || a.lane - b.lane)[0];
    if (worst && worst.threat - worst.defence > 45 && worst.front >= 0) {
      const prefs = worst.hasRam ? (['spearmen', 'imps', 'shieldbearer', 'archers'] as CardId[]) : DEFENDERS;
      const card = this.affordable(sim, prefs);
      if (card) return this.place(sim, card, worst.lane, worst.front - 350);
      return null; // save mana for defence
    }

    // 3. Bring out heroes once the match is under way.
    if (sim.tick > 200) {
      for (const hero of ['warden', 'ranger'] as const) {
        if (pl.hand.includes(hero) && pl.mana >= (CARDS[hero].cost + 1) * MANA.perMana) {
          const lane = this.attackLane(sim, views);
          return this.place(sim, hero, lane, sim.maxU(me, lane) - 300);
        }
      }
    }

    // 4. Support a Ram that was just sent.
    if (this.supportLane !== -1) {
      const lane: LaneId = this.supportLane;
      const card = this.affordable(sim, ['archers', 'spearmen', 'imps']);
      if (card) {
        this.supportLane = -1;
        return this.place(sim, card, lane, sim.maxU(me, lane) - 500);
      }
    }

    // 5. Attack when mana is high (or about to overflow).
    const threshold = this.level === 'easy' ? 9 : 7 + this.rng.int(3);
    if (pl.mana >= threshold * MANA.perMana) {
      const lane = this.attackLane(sim, views);
      const card = this.affordable(sim, ATTACKERS);
      if (card) {
        if (card === 'ram') this.supportLane = lane;
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

  private heroOrder(sim: Sim, kind: HeroKind): Command | null {
    const me = this.player;
    const h = sim.heroOf(me, kind);
    if (!h || !h.alive || h.deploy > 0) return null;
    const views = this.lanes(sim);
    const order = (o: Command & { t: 'order' }): Command | null =>
      o.order === h.order.type && (o.lane === undefined || o.lane === h.order.lane) && (o.camp === undefined || o.camp === h.order.camp) ? null : o;

    if (h.order.type === 'retreat') {
      if (h.hp * 10 < h.maxHp * 9) return null; // heal up first
      const lane = this.attackLane(sim, views);
      return order({ t: 'order', player: me, hero: kind, order: sim.heroLane(h) === lane ? 'push' : 'gank', lane });
    }
    if (h.hp * 10 < h.maxHp * 3) return order({ t: 'order', player: me, hero: kind, order: 'retreat' });

    const danger = [...views].sort((a, b) => (b.threat - b.defence) - (a.threat - a.defence) || a.lane - b.lane)[0];
    const current = sim.heroLane(h);

    if (kind === 'warden') {
      if (danger && danger.threat > 30) {
        const tower = sim.towerOf(me, danger.lane);
        if (tower && tower.alive) return order({ t: 'order', player: me, hero: kind, order: 'defend', lane: danger.lane });
      }
      const lane = this.attackLane(sim, views);
      return order({ t: 'order', player: me, hero: kind, order: current === lane ? 'push' : 'gank', lane });
    }

    // Ranger: gank where it helps, farm when quiet, otherwise push.
    if (h.order.type === 'gank' || h.order.type === 'farm') return null;
    if (sim.tick - this.lastGank > 300) {
      const target = views
        .filter((v) => v.lane !== current && (v.threat > 20 || v.push > 20))
        .sort((a, b) => b.threat + b.push - (a.threat + a.push) || a.lane - b.lane)[0];
      if (target) {
        this.lastGank = sim.tick;
        return { t: 'order', player: me, hero: kind, order: 'gank', lane: target.lane };
      }
    }
    const quiet = views.every((v) => v.threat < 15);
    if (quiet && h.level < 4 && this.rng.chance(35)) {
      const camps = sim.camps();
      let pick = -1;
      let bestD = Infinity;
      CAMPS.forEach((_, i) => {
        const c = camps[i];
        if (!c || !c.alive) return;
        const d = (c.x - h.x) * (c.x - h.x) + (c.y - h.y) * (c.y - h.y);
        if (d < bestD) { bestD = d; pick = i; }
      });
      if (pick >= 0) return { t: 'order', player: me, hero: kind, order: 'farm', camp: pick };
    }
    return order({ t: 'order', player: me, hero: kind, order: 'push', lane: current });
  }
}
