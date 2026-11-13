// Drawing only, in the batik paper style (DEC-018, DEC-013). Reads the match state and the UI state;
// never changes the rules. The painted map is cached (see art.ts); characters come from figures.ts,
// ultimate effects from ultfx.ts; the fog of war (DEC-012) is drawn over everything you can't see.
import { CORES, FIELD, LANES, LANE_HALF, LANE_NAMES, pointAt } from '../game/map';
import { CLASSES, HEROES, ITEMS, ITEM_SLOTS, MANA, MATCH, TICKS_PER_SECOND, UNITS, WARDS, type HeroKind, type ItemId } from '../game/rules';
import { type AttackStyle, type BubbleRects, attackStyle, drawBubble, drawCastRays, drawCharge, drawEdgeTab, drawImpact, drawNumber, drawShot, drawSlash, drawStatus, drawTargetLine, drawThud, drawUltBadge, flightMs } from './combat';
import type { Ent, GameEvent, Sim } from '../game/sim';
import { MapPainter, PAL, SPECIES_COLORS, batikPattern, glyph, kubu, pusaka, songket, teamColors, type Glyph } from './art';
import { drawHeroFigure, drawPortrait, drawTroopFigure, heroScale } from './figures';
import { type HeroPanel, type Layout, type Rect, ringSlot, toScreen } from './layout';
import { COMMAND_ORDERS, type CommandAction, commandTargets, orderLabel, orderTargets } from './placement';
import { ULT_BANNER_MS, ULT_BURST_MS, type UltFx, drawUltAura, drawUltBanner, drawUltBurst } from './ultfx';

/** Ring colour of a hero = its best order. */
export const ORDER_COLORS: Record<'push' | 'defend' | 'gank' | 'farm', string> = {
  push: '#f0932b', defend: '#4f8fe0', gank: '#e5534b', farm: '#5fb86b',
};

const INK = PAL.ink;
const HERO_H = 42; // hero figure height, CSS px (before each hero's own scale); heroic proportions (PLAN-014)
const TROOP_H = 24;

export interface UiState {
  /**
   * The order ring round the thumb (DEC-021): the hero, the ring's centre, the order under the
   * finger, whether it stays open for taps (opened by a quick tap), and whether it is still waiting
   * for a hold (pressed on the hero on the map, which could also be the start of a scroll).
   */
  ring: { hero: HeroKind; cx: number; cy: number; sel: CommandAction | null; sticky: boolean; pending: boolean; at: number } | null;
  /** The order being aimed: its targets light up until one is tapped (or the finger lets go on one). */
  command: { hero: HeroKind; action: CommandAction } | null;
  /** The finger, while it is still down after sliding out of the ring to aim (one-gesture orders). */
  aim: { x: number; y: number } | null;
  hover: { x: number; y: number } | null;
  toast: { text: string; until: number } | null;
}

interface Fx {
  ev: GameEvent; born: number; slot: number;
  /** Hits (PLAN-013): how the attacker strikes, and a damage number when a hero was involved. */
  style?: AttackStyle; num?: 'dealt' | 'taken';
  /** Deaths: which way the piece faced, so it topples the right way. */
  facing?: 1 | -1;
}

/** What one of your heroes last said, and what it was doing, to notice changes worth a word (PLAN-013). */
interface Talk { sig: string; waiting: boolean; fallback: boolean; low: boolean; ult: boolean; alive: boolean; text: string; color: string; at: number }

const SAY_MS = 1900; // how long a speech bubble stays
const SAY_GAP_MS = 2300; // the quietest a hero stays between ordinary remarks

export const DRAG_LIFT = 28; // while aiming with the finger down, the aim point sits a little above it

export class Renderer {
  private fx: Fx[] = [];
  private ults: UltFx[] = [];
  private lastSeen = new Map<number, { x: number; y: number; at: number }>();
  private facing = new Map<number, 1 | -1>();
  /** Per-piece animation memory (drawing only): distance walked, last health, when it was hit and first seen. */
  private anim = new Map<number, { dist: number; x: number; y: number; hp: number; hurtAt: number; born: number }>();
  private vision: [number, number, number][] = [];
  private fogCanvas: HTMLCanvasElement | null = null;
  private fogWash: HTMLCanvasElement | null = null;
  private painter = new MapPainter();
  private now = 0;
  /** When each hero's ultimate fired (`owner:hero`), for its cast moment on the hero (PLAN-013). */
  private casts = new Map<string, number>();
  private talk = new Map<number, Talk>();
  /** When each enemy hero was last in sight, so coming back into sight gets called out. */
  private spotted = new Map<number, number>();
  /** Your heroes that are off the screen, as tabs at the map's edge (tap one to look there). */
  offscreen: { hero: HeroKind; x: number; y: number }[] = [];
  /** Speech bubbles placed this frame (they step up rather than overlap). */
  private bubbles: BubbleRects = [];

  addEvents(evs: GameEvent[], now: number, sim?: Sim): void {
    for (const ev of evs) {
      if (ev.k === 'ult') {
        this.ults.push({ hero: ev.hero, owner: ev.owner, x: ev.x, y: ev.y, r: ev.r, x2: ev.x2, y2: ev.y2, start: now });
        this.casts.set(`${ev.owner}:${ev.hero}`, now);
        continue;
      }
      // Stack pop-up texts that appear at the same place at the same time, so they don't overlap.
      let slot = 0;
      if (ev.k === 'text') {
        for (const f of this.fx) {
          if (f.ev.k === 'text' && now - f.born < 800 && Math.abs(f.ev.x - ev.x) < 600 && Math.abs(f.ev.y - ev.y) < 400) slot = Math.max(slot, f.slot + 1);
        }
      }
      const f: Fx = { ev, born: now, slot };
      if (ev.k === 'hit') {
        // how the attacker strikes (looked up now: it may be gone by the time the shot lands)
        const a = sim && ev.from ? sim.get(ev.from) : undefined;
        const t = sim && ev.to ? sim.get(ev.to) : undefined;
        const team = teamColors(ev.owner).light;
        f.style = a ? attackStyle(a.kind, a.hero, a.unit, a.range, team) : { shot: ev.ranged ? 'bolt' : null, color: team, heavy: false };
        if (a && t && (ev.dmg ?? 0) > 0 && (a.kind === 'hero' || t.kind === 'hero')) f.num = t.owner === 0 ? 'taken' : 'dealt';
      }
      if (ev.k === 'death' && ev.id) f.facing = this.facing.get(ev.id) ?? 1;
      this.fx.push(f);
    }
    if (this.fx.length > 400) this.fx.splice(0, this.fx.length - 400);
  }

  reset(): void {
    this.fx = [];
    this.ults = [];
    this.lastSeen.clear();
    this.casts.clear();
    this.talk.clear();
    this.spotted.clear();
    this.offscreen = [];
    this.facing.clear();
    this.anim.clear();
  }

  draw(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, ui: UiState, alpha: number, now: number): void {
    this.now = now;
    this.vision = visionCircles(sim);
    ctx.save();
    ctx.setTransform(l.dpr, 0, 0, l.dpr, 0, 0);
    ctx.fillStyle = batikPattern(ctx, 'cloth', l.dpr);
    ctx.fillRect(0, 0, l.w, l.h);
    this.drawField(ctx, l, sim);
    this.updateTalk(sim, now);
    this.bubbles = [];
    ctx.save();
    ctx.beginPath();
    ctx.rect(l.field.x, l.field.y, l.field.w, l.field.h);
    ctx.clip();
    this.drawEnts(ctx, l, sim, alpha, now);
    this.drawFx(ctx, l, now);
    this.drawUltBursts(ctx, l, now);
    this.drawFog(ctx, l);
    this.drawHealthOverFog(ctx, l, sim);
    this.drawUltBanners(ctx, l, now);
    this.drawCommandTargets(ctx, l, sim, ui, alpha, now);
    this.drawBubbles(ctx, l, sim, alpha, now);
    this.drawOffscreen(ctx, l, sim, alpha, now);
    ctx.restore();
    this.drawZoomButton(ctx, l);
    this.drawTop(ctx, l, sim);
    this.drawHud(ctx, l, sim, ui);
    this.drawAimHint(ctx, l, ui);
    this.drawRing(ctx, l, sim, ui, now);
    // messages sit above the lane chips, or at the top of the map while a ring is open (so they never cover it)
    if (ui.toast && ui.toast.until > now) this.drawToast(ctx, l, ui.toast.text, ui.ring && !ui.ring.pending ? l.field.y + 34 : l.waves[0].y - 46);
    ctx.restore();
  }

  // ---------- field and fog ----------

  private drawField(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim): void {
    const f = l.field;
    // the board sits on a sheet of cream paper with a soga-brown border line and a paper shadow;
    // in the usual full-width view its sides run off the screen's edges (DEC-019)
    const [bx0, by0] = toScreen(l, FIELD.minX, FIELD.minY);
    const [bx1, by1] = toScreen(l, FIELD.maxX, FIELD.maxY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x, f.y, f.w, f.h);
    ctx.clip();
    // a crisp offset shadow (a blurred one over the whole board cost several ms a frame)
    ctx.fillStyle = 'rgba(5,8,20,0.5)';
    ctx.fillRect(bx0 - 3, by0 - 1, bx1 - bx0 + 10, by1 - by0 + 10);
    ctx.fillStyle = PAL.paperEdge;
    ctx.fillRect(bx0 - 5, by0 - 5, bx1 - bx0 + 10, by1 - by0 + 10);
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.strokeStyle = PAL.wood;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx0 - 2.5, by0 - 2.5, bx1 - bx0 + 5, by1 - by0 + 5);
    ctx.restore();
    this.painter.draw(ctx, l, sim);
  }

  private lanePath(ctx: CanvasRenderingContext2D, l: Layout, id: number, fromS = 0, toS = Infinity): void {
    const lane = LANES[id];
    ctx.beginPath();
    const a = Math.max(0, fromS);
    const b = Math.min(lane.length, toS);
    let first = true;
    const pts: [number, number][] = [];
    if (a === 0 && b === lane.length) for (const p of lane.pts) pts.push([p[0], p[1]]);
    else for (let s = a; s <= b; s += 80) pts.push([...pointAt(lane, Math.round(s))]);
    for (const [wx, wy] of pts) {
      const [x, y] = toScreen(l, wx, wy);
      if (first) ctx.moveTo(x, y), (first = false);
      else ctx.lineTo(x, y);
    }
  }

  /** Is a world point inside your vision (DEC-012)? */
  private seen(x: number, y: number): boolean {
    for (const [cx, cy, r] of this.vision) if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) return true;
    return false;
  }

  private fxSeen(ev: GameEvent): boolean {
    switch (ev.k) {
      case 'hit': case 'line': return ev.owner === 0 || this.seen(ev.x2, ev.y2) || this.seen(ev.x1, ev.y1);
      case 'boom': case 'death': case 'text': return ('owner' in ev && ev.owner === 0) || this.seen(ev.x, ev.y);
      default: return true;
    }
  }

  /** Darken everything outside your vision, with soft edges. Drawn at half resolution (it is blurry anyway). */
  private drawFog(ctx: CanvasRenderingContext2D, l: Layout): void {
    const f = l.field;
    const k = 0.5 * l.dpr;
    const w = Math.max(1, Math.round(f.w * k));
    const h = Math.max(1, Math.round(f.h * k));
    if (!this.fogCanvas) this.fogCanvas = document.createElement('canvas');
    const c = this.fogCanvas;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d');
    if (!g) return;
    // the indigo dye with its batik motifs is made once per size, then copied in each frame (one pass)
    let wash = this.fogWash;
    if (!wash || wash.width !== w || wash.height !== h) {
      wash = document.createElement('canvas');
      wash.width = w; wash.height = h;
      const wg = wash.getContext('2d');
      if (wg) {
        wg.fillStyle = 'rgba(14,20,44,0.70)';
        wg.fillRect(0, 0, w, h);
        wg.fillStyle = batikPattern(wg, 'fog', k, k);
        wg.fillRect(0, 0, w, h);
      }
      this.fogWash = wash;
    }
    g.globalCompositeOperation = 'copy';
    g.drawImage(wash, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    for (const [wx, wy, r] of this.vision) {
      const [sx, sy] = toScreen(l, wx, wy);
      const x = (sx - f.x) * k;
      const y = (sy - f.y) * k;
      const rr = r * l.scale * k;
      const grad = g.createRadialGradient(x, y, rr * 0.78, x, y, rr);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    }
    ctx.drawImage(c, f.x, f.y, f.w, f.h);
  }

  // ---------- entities ----------

  private drawEnts(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, alpha: number, now: number): void {
    this.drawZones(ctx, l, sim);
    for (const e of sim.ents) if (e.kind === 'camp') this.drawCamp(ctx, l, e, now);
    for (const e of sim.ents) if (e.kind === 'relic' && e.alive) this.drawRelic(ctx, l, e, now);
    for (const e of sim.ents) if (e.kind === 'ward' && e.alive && sim.sees(0, e)) this.drawWard(ctx, l, e, now);
    for (const e of sim.ents) if (e.kind === 'tower' || e.kind === 'core') this.drawStructure(ctx, l, sim, e);
    for (const e of sim.ents) if (e.kind === 'hero' && e.owner === 0 && e.alive) this.drawOrderLine(ctx, l, sim, e, alpha);
    // Characters, back to front (higher on screen first), fliers on top.
    const people = sim.ents.filter((e) => (e.kind === 'unit' || e.kind === 'hero') && e.alive);
    if (this.anim.size > people.length + 200) {
      const live = new Set(people.map((e) => e.id));
      for (const id of this.anim.keys()) if (!live.has(id)) this.anim.delete(id);
    }
    people.sort((a, b) => (a.flying === b.flying ? a.y - b.y || a.id - b.id : a.flying ? 1 : -1));
    this.drawTargetLines(ctx, l, sim, alpha, now);
    for (const e of people) {
      if (e.kind === 'hero') this.drawHero(ctx, l, sim, e, alpha, now);
      else if (sim.sees(0, e)) this.drawUnit(ctx, l, sim, e, alpha, now);
    }
    this.drawGhosts(ctx, l, sim, now);
    this.drawDuels(ctx, l, sim, alpha);
  }

  private drawZones(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim): void {
    for (const z of sim.zones) {
      const left = (z.until - sim.tick) / TICKS_PER_SECOND;
      const fade = Math.min(1, left / 1.5);
      ctx.save();
      if (z.kind === 'lantern' || z.kind === 'fog') {
        const [x, y] = toScreen(l, z.x, z.y);
        ctx.globalAlpha = fade;
        if (z.kind === 'lantern') {
          ctx.strokeStyle = z.owner === 0 ? 'rgba(224,176,74,0.5)' : 'rgba(244,162,140,0.5)';
          ctx.setLineDash([3, 5]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, z.r * l.scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          glyph(ctx, 'lantern', x, y, 6, PAL.gold);
        } else {
          ctx.fillStyle = 'rgba(235,240,236,0.38)';
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(x + Math.cos(i * 1.3) * z.r * l.scale * 0.4, y + Math.sin(i * 1.7) * z.r * l.scale * 0.3, z.r * l.scale * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // Lane-wide effects tint the lane.
        ctx.globalAlpha = 0.35 * fade;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = LANE_HALF * 2 * l.scale;
        ctx.strokeStyle = z.kind === 'flood' ? '#3aa0b5' : z.owner === 0 ? PAL.youLight : PAL.foeLight;
        this.lanePath(ctx, l, z.lane);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawDuels(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, alpha: number): void {
    for (const e of sim.ents) {
      if (e.kind !== 'hero' || !e.alive || !e.duelWith || e.id > e.duelWith) continue;
      const o = sim.get(e.duelWith);
      if (!o || !o.alive || !sim.sees(0, e) || !sim.sees(0, o)) continue;
      const [x1, y1] = toScreen(l, ...this.pos(e, alpha));
      const [x2, y2] = toScreen(l, ...this.pos(o, alpha));
      ctx.save();
      ctx.strokeStyle = PAL.gold;
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc((x1 + x2) / 2, (y1 + y2) / 2 - 12, Math.hypot(x2 - x1, y2 - y1) / 2 + 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawCamp(ctx: CanvasRenderingContext2D, l: Layout, e: Ent, now: number): void {
    const [x, y] = toScreen(l, e.x, e.y);
    const boss = e.campKind === 'boss';
    const r = Math.max(boss ? 15 : 10, e.r * l.scale);
    if (!e.alive) {
      label(ctx, `${Math.ceil(e.respawn / TICKS_PER_SECOND)}s`, x, y, PAL.parchment, 10);
      return;
    }
    const g: Glyph = boss ? 'trunk' : e.campKind === 'den' ? 'paw' : 'fruit';
    const bob = boss ? Math.sin(now / 400) * 1.5 : 0;
    ctx.save();
    ctx.fillStyle = 'rgba(16,14,34,0.35)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + r * 0.6, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = boss ? '#3c7f8f' : e.campKind === 'den' ? '#7a5032' : '#c98a2b';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y + bob, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y + bob, r - 3, 0, Math.PI * 2); ctx.stroke();
    glyph(ctx, g, x, y + bob, r * 0.6, PAL.parchment);
    ctx.restore();
    if (e.hp < e.maxHp) hpBar(ctx, x, y - r - 6, r * 2.2, e.hp / e.maxHp, PAL.gold);
  }

  private drawRelic(ctx: CanvasRenderingContext2D, l: Layout, e: Ent, now: number): void {
    const [x, y] = toScreen(l, e.x, e.y);
    const pulse = 0.5 + 0.5 * Math.sin(now / 250);
    ctx.save();
    ctx.fillStyle = `rgba(224,176,74,${0.15 + pulse * 0.2})`;
    ctx.beginPath(); ctx.arc(x, y, 12 + pulse * 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    glyph(ctx, 'gem', x, y, 7, e.relic === 0 ? '#c79bff' : e.relic === 1 ? '#9be37b' : PAL.gold);
    ctx.restore();
  }

  private drawWard(ctx: CanvasRenderingContext2D, l: Layout, e: Ent, now: number): void {
    const [x, y] = toScreen(l, e.x, e.y);
    const c = teamColors(e.owner);
    ctx.save();
    if (e.owner === 0) {
      // what your ward can see
      ctx.strokeStyle = 'rgba(156,192,255,0.35)';
      ctx.setLineDash([2, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, WARDS.radius * l.scale, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    const flick = 0.75 + 0.25 * Math.sin(now / 120 + e.id);
    ctx.fillStyle = `rgba(255,214,120,${0.35 * flick})`;
    ctx.beginPath(); ctx.arc(x, y - 6, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x, y - 2); ctx.stroke();
    glyph(ctx, 'lantern', x, y - 6, 5.5, c.base);
    ctx.restore();
  }

  /** Towers and the Pusaka, with a big health bar and the number (DEC-013). */
  private drawStructure(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, e: Ent): void {
    const [x, y] = toScreen(l, e.x, e.y);
    const isCore = e.kind === 'core';
    const s = isCore ? Math.max(36, e.r * 1.6 * l.scale) : Math.max(22, e.r * 1.9 * l.scale);
    if (isCore) pusaka(ctx, x, y, s, e.owner, e.alive);
    else kubu(ctx, x, y, s, e.owner, e.alive);
    if (!e.alive) return;
    ctx.save();
    if (e.kind === 'tower' && sim.tick < MATCH.towerShieldUntil) {
      ctx.strokeStyle = 'rgba(224,176,74,0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(x, y, s * 0.85, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (e.shield > 0) {
      ctx.strokeStyle = '#eaf6ff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, s * 0.9, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  /** Structure health bars are drawn above the fog so they are always readable. */
  private drawHealthOverFog(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim): void {
    for (const e of sim.ents) {
      if ((e.kind !== 'tower' && e.kind !== 'core') || !e.alive) continue;
      const [x, y] = toScreen(l, e.x, e.y);
      const isCore = e.kind === 'core';
      const s = isCore ? Math.max(36, e.r * 1.6 * l.scale) : Math.max(22, e.r * 1.9 * l.scale);
      const by = e.owner === 0 ? y + s * 0.55 + 7 : y - s * 0.62 - 9;
      bigHealthBar(ctx, x, by, isCore ? 62 : 46, e.hp, e.maxHp, e.owner, e.shield);
    }
  }

  private pos(e: Ent, alpha: number): [number, number] {
    return [e.px + (e.x - e.px) * alpha, e.py + (e.y - e.py) * alpha];
  }

  /** Which way a piece faces: towards what it is hitting while it fights, else the way it walks. */
  private face(e: Ent, sim: Sim): 1 | -1 {
    const dx = e.x - e.px;
    let f = this.facing.get(e.id) ?? (e.owner === 1 ? -1 : 1);
    const t = e.atkCd > 0 && e.targetId ? sim.get(e.targetId) : undefined;
    if (t && Math.abs(t.x - e.x) > 20) f = t.x > e.x ? 1 : -1;
    else if (dx > 1) f = 1;
    else if (dx < -1) f = -1;
    this.facing.set(e.id, f);
    return f;
  }

  /** During a strike, melee pieces lunge a little towards their target and ranged ones rock back (PLAN-013). */
  private lunge(e: Ent, sim: Sim, attack: number, g: number): [number, number] {
    if (attack < 0.3 || attack > 0.85 || !e.targetId) return [0, 0];
    const t = sim.get(e.targetId);
    if (!t) return [0, 0];
    const dx = t.x - e.x;
    const dy = t.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.sin(((attack - 0.3) / 0.55) * Math.PI) * (e.range > 300 ? -2 : 5) * g;
    return [(dx / d) * k, (dy / d) * k];
  }

  /**
   * Animation inputs for a piece's figure: the walk cycle follows the distance actually walked
   * (one full stride per STRIDE world units), idle breathing when standing, a flash when it was
   * just hit, and a rise when it first appears.
   */
  private pose(e: Ent, wx: number, wy: number, now: number): { walk: number; attack: number; idle: number; hurt: number; spawn: number } {
    let a = this.anim.get(e.id);
    if (!a) { a = { dist: 0, x: wx, y: wy, hp: e.hp, hurtAt: -1e9, born: now }; this.anim.set(e.id, a); }
    a.dist += Math.hypot(wx - a.x, wy - a.y);
    a.x = wx;
    a.y = wy;
    if (e.hp < a.hp) a.hurtAt = now;
    a.hp = e.hp;
    const STRIDE = e.kind === 'hero' ? 260 : 210;
    const moving = e.x !== e.px || e.y !== e.py;
    const walk = moving ? ((a.dist / STRIDE + e.id * 0.37) % 1) || 0.001 : 0;
    const since = e.attackTicks - e.atkCd; // ticks since the last swing started
    const attack = e.atkCd > 0 && since >= 0 && since < 8 && e.targetId ? (since + 1) / 8 : 0;
    return {
      walk, attack,
      idle: (now / 1600 + e.id * 0.13) % 1,
      hurt: Math.max(0, 1 - (now - a.hurtAt) / 220),
      spawn: Math.min(1, (now - a.born) / 380),
    };
  }

  /** Characters keep their size in the usual full-width view and grow (or shrink) with the zoom, a bit
   *  less than the map does, so a zoomed view still fits. */
  private grow(l: Layout): number {
    return Math.max(0.7, 1 + (l.scale / l.homeScale - 1) * 0.75);
  }

  private drawUnit(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, e: Ent, alpha: number, now: number): void {
    const [wx, wy] = this.pos(e, alpha);
    const [x, y] = toScreen(l, wx, wy);
    const g = this.grow(l);
    const kind = e.unit ?? 'spearman';
    if (kind === 'watchtower') {
      kubu(ctx, x, y, 18, e.owner, true);
    } else {
      const p = this.pose(e, wx, wy, now);
      const faded = kind === 'decoy' && e.owner !== 0 ? 1 : kind === 'decoy' ? 0.55 : 1;
      const [lx, ly] = this.lunge(e, sim, p.attack, g);
      drawTroopFigure(ctx, kind, x + lx, y + ly, TROOP_H * g, e.owner, l.dpr, {
        facing: this.face(e, sim), ...p, flying: e.flying, wave: e.wave, alpha: (e.deploy > 0 ? 0.5 : 1) * faded,
      });
    }
    this.marks(ctx, e, x, y - 9 * g, 7 * g, now);
    if (e.hp < e.maxHp) hpBar(ctx, x, y - TROOP_H * g - 4, 16 * g, e.hp / e.maxHp, teamColors(e.owner).light);
  }

  private drawHero(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, e: Ent, alpha: number, now: number): void {
    const mine = e.owner === 0;
    if (!mine && !sim.sees(0, e)) return; // fog or jungle: see drawGhosts
    if (!mine) this.lastSeen.set(e.id, { x: e.x, y: e.y, at: now });
    const [wx, wy] = this.pos(e, alpha);
    const [x, y] = toScreen(l, wx, wy);
    const kind = e.hero as HeroKind;
    const p = this.pose(e, wx, wy, now);
    const fly = e.flying;
    const g = this.grow(l);
    const ht = HERO_H * g * heroScale(kind);
    const top = y - ht * 1.06 - (fly ? 12 * g : 0) - 4; // clear of the head and the team pennant
    // the ultimate's cast moment (PLAN-013): rays behind, the hero pops up and flashes
    const castAt = this.casts.get(`${e.owner}:${kind}`);
    const ct = castAt === undefined ? 9 : (now - castAt) / 850;
    const pop = ct < 1 ? 1 + 0.3 * Math.sin(Math.PI * Math.min(1, ct * 1.7)) : 1;
    ctx.save();
    if (ct < 1) drawCastRays(ctx, x, y - ht * 0.5, ct, g, teamColors(e.owner).base);
    // ULT ready (yours): a gold ring at the feet; called: a turning ring with sparks, waiting for its moment
    if (mine && e.ultReady && e.ultArmed) drawCharge(ctx, x, y + 1, g, now);
    else if (mine && e.ultReady) {
      ctx.strokeStyle = 'rgba(224,176,74,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y + 1, 17 * g, 6.5 * g, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (e.ultUntil > sim.tick) drawUltAura(ctx, kind, x, y, ht, now);
    const [lx, ly] = this.lunge(e, sim, p.attack, g);
    drawHeroFigure(ctx, kind, x + lx, y + ly, HERO_H * g * pop, e.owner, l.dpr, {
      facing: this.face(e, sim), ...p, hurt: Math.max(p.hurt, ct < 0.3 ? 1 - ct / 0.3 : 0), flying: fly, transformed: e.transformed,
      alpha: mine && e.hidden ? 0.6 : 1,
    });
    // level badge and fury
    ctx.fillStyle = PAL.gold;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + 13 * g, top + 2, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    label(ctx, String(e.level), x + 13 * g, top + 2.5, INK, 9);
    if (e.fury > 0) label(ctx, '✹', x - 14 * g, top + 2, '#ff7a3d', 11);
    ctx.restore();
    this.marks(ctx, e, x, y - ht * 0.5, 12 * g, now);
    hpBar(ctx, x - 2, top + 2, 22 * g, e.hp / e.maxHp, mine ? PAL.youLight : PAL.foeLight);
    if (mine && e.ultReady && ct >= 1 && !this.saying(e.id, now)) drawUltBadge(ctx, x, top - 7, now);
  }

  /** An enemy hero that slipped into the fog or the jungle: a fading "?" where it was last seen. */
  private drawGhosts(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, now: number): void {
    for (const e of sim.ents) {
      if (e.kind !== 'hero' || e.owner === 0 || !e.alive || sim.sees(0, e)) continue;
      const seen = this.lastSeen.get(e.id);
      if (!seen || now - seen.at > 4000) continue;
      const [x, y] = toScreen(l, seen.x, seen.y);
      ctx.save();
      ctx.globalAlpha = 0.7 * (1 - (now - seen.at) / 4000);
      ctx.fillStyle = 'rgba(20,10,5,0.6)';
      ctx.beginPath(); ctx.arc(x, y - 12, 11, 0, Math.PI * 2); ctx.fill();
      label(ctx, '?', x, y - 11, PAL.foeLight, 14);
      ctx.restore();
    }
  }

  /** Small marks for effects on a unit or hero. */
  private marks(ctx: CanvasRenderingContext2D, e: Ent, x: number, y: number, r: number, now: number): void {
    ctx.save();
    // stun stars, a silenced bubble, poison drops and a frost ring at the feet (PLAN-013)
    drawStatus(ctx, e, x, y - r * 0.6, r, now);
    if (e.shield > 0) {
      ctx.strokeStyle = '#f2fbff';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, r + 4.5, 0, Math.PI * 2); ctx.stroke();
    }
    if (e.charm > 0) {
      ctx.strokeStyle = '#c38bff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke();
    }
    if (e.mark > 0) {
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - r - 5, y); ctx.lineTo(x + r + 5, y);
      ctx.moveTo(x, y - r - 5); ctx.lineTo(x, y + r + 5);
      ctx.stroke();
    }
    if (e.immune > 0) {
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText('◆', x, y - r - 13);
      ctx.fillStyle = '#ffe066';
      ctx.fillText('◆', x, y - r - 13);
    }
    ctx.restore();
  }

  // ---------- where heroes attack, and heroes talking back (PLAN-013) ----------

  /** Each visible hero that is fighting: a line to what it is hitting, with a reticle. Yours in gold;
   *  an enemy hero hitting one of your pieces in red. */
  private drawTargetLines(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, alpha: number, now: number): void {
    const g = this.grow(l);
    for (const h of sim.ents) {
      if (h.kind !== 'hero' || !h.alive || !h.targetId || h.atkCd <= 0) continue;
      const mine = h.owner === 0;
      if (!mine && !sim.sees(0, h)) continue;
      const t = sim.get(h.targetId);
      if (!t || !t.alive || t.hp <= 0) continue;
      if (!mine && t.owner !== 0) continue;
      if (mine && t.kind !== 'tower' && t.kind !== 'core' && t.kind !== 'camp' && !sim.sees(0, t)) continue;
      const [hx, hy] = toScreen(l, ...this.pos(h, alpha));
      const [tx, ty] = toScreen(l, ...this.pos(t, alpha));
      const big = t.kind === 'tower' || t.kind === 'core' || t.kind === 'camp';
      const r = big ? Math.max(14, t.r * l.scale) : t.kind === 'hero' ? 12 * g : 9 * g;
      drawTargetLine(ctx, hx, hy - 12 * g, tx, big ? ty : ty - 10 * g, mine ? '#ffd98a' : '#ff7a5c', r, now);
    }
  }

  /** Is a hero saying something right now? */
  private saying(id: number, now: number): boolean {
    const m = this.talk.get(id);
    return !!m && now - m.at < SAY_MS;
  }

  /** Notice what your heroes are up to and give them a word when something changes (rate-limited). */
  private updateTalk(sim: Sim, now: number): void {
    for (const h of sim.heroes(0)) {
      const sig = `${h.order.type}:${h.order.lane}:${h.order.camp}:${h.order.spot}:${h.order.target}:${h.order.x}:${h.order.y}`;
      const low = h.alive && h.hp * 100 < h.maxHp * 30;
      let m = this.talk.get(h.id);
      if (!m) {
        m = { sig, waiting: h.waiting, fallback: h.fallback, low, ult: h.ultReady, alive: h.alive, text: '', color: PAL.you, at: -1e9 };
        this.talk.set(h.id, m);
        continue;
      }
      const memo = m;
      const say = (text: string, color: string, urgent: boolean) => {
        if (!urgent && now - memo.at < SAY_GAP_MS) return;
        memo.text = text; memo.color = color; memo.at = now;
      };
      if (h.alive && !m.alive) say('Back in the fight!', PAL.you, true);
      else if (h.alive) {
        const foeNear = sim.heroes(1).some((o) => o.alive && sim.sees(0, o) && Math.hypot(o.x - h.x, o.y - h.y) < 900);
        if (low && !m.low) say(foeNear ? 'Help! I\'m in trouble!' : 'I\'m badly hurt!', PAL.foe, true);
        else if (h.fallback && !m.fallback) say('Falling back to heal!', PAL.foe, true);
        else if (h.ultReady && !m.ult) say(`${HEROES[h.hero as HeroKind].ult.name} is ready!`, PAL.gold, true);
        else if (sig !== m.sig) say(this.orderSpeech(h, sim), PAL.you, true); // a new order always gets an answer
        else if (h.waiting && !m.waiting) say('Waiting for our troops…', PAL.you, false);
      }
      m.sig = sig; m.waiting = h.waiting; m.fallback = h.fallback; m.low = low; m.ult = h.ultReady; m.alive = h.alive;
    }
    // an enemy hero coming back into sight: the nearest of your heroes calls it out
    for (const e of sim.heroes(1)) {
      if (!e.alive || !sim.sees(0, e)) continue;
      const last = this.spotted.get(e.id) ?? -1e9;
      this.spotted.set(e.id, now);
      if (now - last < 8000) continue;
      let best: Ent | null = null;
      let bestD = 1600;
      for (const h of sim.heroes(0)) {
        const d = Math.hypot(h.x - e.x, h.y - e.y);
        if (h.alive && d < bestD) { bestD = d; best = h; }
      }
      const m = best ? this.talk.get(best.id) : undefined;
      if (m && now - m.at > 900) { m.text = `${HEROES[e.hero as HeroKind].name} spotted!`; m.color = PAL.foe; m.at = now; }
    }
  }

  /** What a hero says when it takes up an order. */
  private orderSpeech(h: Ent, sim: Sim): string {
    const lane = LANE_NAMES[h.order.lane] ?? '';
    switch (h.order.type) {
      case 'push': return `Pushing ${lane}!`;
      case 'gank': return `Ganking ${lane}!`;
      case 'defend': return `Defending ${lane}!`;
      case 'farm': return sim.get(h.order.camp)?.kind === 'relic' ? 'Getting the relic!' : 'Clearing the camp!';
      case 'ward': return 'Placing a ward!';
      case 'retreat': return 'Heading home!';
      case 'move': return 'On my way!';
      case 'attack': {
        const t = sim.get(h.order.target);
        return t?.kind === 'hero' ? `After ${HEROES[t.hero as HeroKind].name}!` : 'Attacking!';
      }
      default: return 'On it!';
    }
  }

  /** Your heroes' speech bubbles above their heads (or by their edge tab when off the screen). */
  private drawBubbles(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, alpha: number, now: number): void {
    const g = this.grow(l);
    // a hero shouts its ultimate's name as it fires (yours, and the enemy's you can see)
    for (const e of sim.ents) {
      if (e.kind !== 'hero' || !e.alive || (e.owner !== 0 && !sim.sees(0, e))) continue;
      const castAt = this.casts.get(`${e.owner}:${e.hero}`);
      const ct = castAt === undefined ? 9 : (now - castAt) / 850;
      if (ct >= 1.6) continue;
      const [x, y] = toScreen(l, ...this.pos(e, alpha));
      const top = y - HERO_H * g * heroScale(e.hero as HeroKind) * 1.06 - 10;
      drawBubble(ctx, x, top, `${HEROES[e.hero as HeroKind].ult.name}!`, ct < 1.3 ? 1 : 1 - (ct - 1.3) / 0.3, PAL.gold, l.field.x, l.field.x + l.field.w, this.bubbles);
    }
    for (const h of sim.heroes(0)) {
      const m = this.talk.get(h.id);
      if (!m || !h.alive || now - m.at >= SAY_MS) continue;
      const castAt = this.casts.get(`0:${h.hero}`);
      if (castAt !== undefined && now - castAt < 1400) continue; // the ultimate's shout has the stage
      const [x, y] = toScreen(l, ...this.pos(h, alpha));
      const top = y - HERO_H * g * heroScale(h.hero as HeroKind) * 1.06 - 10;
      if (x < l.field.x || x > l.field.x + l.field.w || top < l.field.y + 20 || y > l.field.y + l.field.h) continue; // drawn at its edge tab
      const a = now - m.at > SAY_MS - 300 ? (SAY_MS - (now - m.at)) / 300 : 1;
      drawBubble(ctx, x, top, m.text, a, m.color, l.field.x, l.field.x + l.field.w, this.bubbles);
    }
  }

  /** Your heroes off the screen: a tab at the map's edge with the portrait, red when hurt, gold when
   *  casting; its speech bubble beside it. Tap a tab to look there. */
  private drawOffscreen(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, alpha: number, now: number): void {
    this.offscreen = [];
    const f = l.field;
    const m = 20;
    for (const h of sim.heroes(0)) {
      if (!h.alive) continue;
      const [x, y0] = toScreen(l, ...this.pos(h, alpha));
      const y = y0 - 14;
      if (x >= f.x + 4 && x <= f.x + f.w - 4 && y >= f.y + 4 && y <= f.y + f.h - 4) continue;
      const tx = Math.max(f.x + m, Math.min(f.x + f.w - m, x));
      const ty = Math.max(f.y + m, Math.min(f.y + f.h - m - 34, y)); // clear of the zoom button row at the bottom
      const a = Math.atan2(y - ty, x - tx);
      const hurtAt = this.anim.get(h.id)?.hurtAt ?? -1e9;
      const castAt = this.casts.get(`0:${h.hero}`) ?? -1e9;
      const pulse = 0.5 + 0.5 * Math.sin(now / 120);
      const ring = now - castAt < 2000 ? PAL.gold : now - hurtAt < 1500 ? (pulse > 0.5 ? PAL.foe : '#ff9a8a') : PAL.you;
      const kind = h.hero as HeroKind;
      drawEdgeTab(ctx, tx, ty, a, ring, () => drawPortrait(ctx, kind, tx, ty, 11, 0, l.dpr));
      this.offscreen.push({ hero: kind, x: tx, y: ty });
      const t = this.talk.get(h.id);
      if (t && now - t.at < SAY_MS) {
        const by = ty < f.y + f.h / 2 ? ty + 46 : ty - 16;
        drawBubble(ctx, tx, by, t.text, 1, t.color, f.x, f.x + f.w, this.bubbles);
      }
    }
  }

  private drawOrderLine(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, h: Ent, alpha: number): void {
    let tx = 0;
    let ty = 0;
    switch (h.order.type) {
      case 'push': return;
      case 'gank': tx = h.goalX; ty = h.goalY; break;
      case 'farm': { const c = sim.get(h.order.camp); if (!c) return; tx = c.x; ty = c.y; break; }
      case 'ward': { const t = orderTargets(sim, h).find((o) => o.order === 'ward' && o.spot === h.order.spot); if (!t) return; tx = t.x; ty = t.y; break; }
      case 'defend': { const t = sim.towerOf(0, h.order.lane); if (!t) return; tx = t.x; ty = t.y - 250; break; }
      case 'retreat': tx = CORES[0][0]; ty = CORES[0][1]; break;
      case 'move': tx = h.order.x; ty = h.order.y; break;
    }
    const [hx, hy] = this.pos(h, alpha);
    const [x1, y1] = toScreen(l, hx, hy);
    const [x2, y2] = toScreen(l, tx, ty);
    ctx.save();
    ctx.strokeStyle = 'rgba(224,176,74,0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    if (h.order.type === 'move') flag(ctx, x2, y2);
    ctx.restore();
  }

  // ---------- effects ----------

  private drawFx(ctx: CanvasRenderingContext2D, l: Layout, now: number): void {
    this.fx = this.fx.filter((f) => now - f.born < 1100);
    for (const f of this.fx) {
      const age = now - f.born;
      const ev = f.ev;
      if (!this.fxSeen(ev)) continue;
      ctx.save();
      switch (ev.k) {
        case 'hit': {
          // PLAN-013: the shot flies from the attacker to the target (or a melee slash lands), then
          // paper bursts from the hit, heavy hitters thud, and hero fights show the damage
          const st = f.style;
          const [x1, y1] = toScreen(l, ev.x1, ev.y1);
          const [x2, y2] = toScreen(l, ev.x2, ev.y2);
          const g = this.grow(l);
          const body = 10 * g; // aim at the body, not the feet
          const a = Math.atan2(y2 - y1, x2 - x1);
          const dur = st?.shot ? flightMs(Math.hypot(ev.x2 - ev.x1, ev.y2 - ev.y1)) : 0;
          if (st?.shot && age < dur) {
            const t = age / dur;
            const lob = st.shot === 'stone' || st.shot === 'coin' ? Math.sin(Math.PI * t) * 20 * g : 0;
            drawShot(ctx, st.shot, x1 + (x2 - x1) * t, y1 - body + (y2 - y1) * t - lob, a, g, st.color, teamColors(ev.owner).base, now);
            break;
          }
          const land = age - dur;
          if (!st?.shot && land < 220) drawSlash(ctx, x2, y2 - body, a, land / 220, g, st?.color ?? '#fff6d8');
          if (st?.heavy && land < 320) drawThud(ctx, x2, y2, land / 320, g);
          if (land < 200) drawImpact(ctx, x2, y2 - body, land / 200, g, st?.color ?? PAL.paperEdge, ev.from ?? 0);
          if (f.num && land < 750) {
            const jitter = (((ev.from ?? 0) % 3) - 1) * 6;
            drawNumber(ctx, x2 + jitter, y2 - body - 12 * g, `-${ev.dmg ?? 0}`, land / 750, f.num === 'taken' ? '#ff8a7a' : '#fff3c4', f.num === 'taken' ? 12 : 11);
          }
          break;
        }
        case 'line': {
          if (age > 260) break;
          const [x1, y1] = toScreen(l, ev.x1, ev.y1);
          const [x2, y2] = toScreen(l, ev.x2, ev.y2);
          ctx.globalAlpha = 1 - age / 260;
          ctx.strokeStyle = ev.owner === 0 ? '#cfe0ff' : '#ffd2c8';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          break;
        }
        case 'boom': {
          if (age > 550) break;
          const [x, y] = toScreen(l, ev.x, ev.y);
          const t = age / 550;
          ctx.globalAlpha = 1 - t;
          // batik-like rings
          ctx.strokeStyle = ev.owner === 0 ? PAL.youLight : ev.owner === 1 ? PAL.foeLight : PAL.gold;
          for (const k of [0.45, 0.75, 1]) {
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, ev.r * l.scale * (k * (0.6 + 0.4 * t)), 0, Math.PI * 2); ctx.stroke();
          }
          break;
        }
        case 'death': {
          // PLAN-013: the paper standee topples backwards and fades; paper scraps fly
          const [x, y] = toScreen(l, ev.x, ev.y);
          const g = this.grow(l);
          const team = ev.owner === 0 ? PAL.youLight : ev.owner === 1 ? PAL.foeLight : PAL.gold;
          if (age < 450) {
            const n = ev.big ? 3 : 1;
            for (let k = 0; k < n; k++) drawImpact(ctx, x + (k - 1) * 6 * g, y - 8 * g, age / 450, g * (ev.big ? 1.6 : 1), team, (ev.id ?? 0) + k * 3);
          }
          if ((ev.hero || ev.unit) && age < 700) {
            const t = age / 700;
            const fall = Math.min(1, t * 1.7);
            const dir = -(f.facing ?? 1); // falls backwards, away from what it faced
            ctx.globalAlpha = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
            ctx.translate(x, y);
            ctx.rotate(dir * (Math.PI / 2) * fall * fall);
            ctx.translate(-x, -y);
            const o = { facing: f.facing ?? 1, walk: 0, attack: 0, hurt: 0.7 * (1 - t) } as const;
            if (ev.hero) drawHeroFigure(ctx, ev.hero, x, y, HERO_H * g, ev.owner, l.dpr, o);
            else if (ev.unit) drawTroopFigure(ctx, ev.unit, x, y, TROOP_H * g, ev.owner, l.dpr, o);
          }
          break;
        }
        case 'text': {
          const [x, y] = toScreen(l, ev.x, ev.y);
          ctx.globalAlpha = 1 - age / 1100;
          const color = ev.tone === 'mana' ? '#e7c6ff' : ev.tone === 'ambush' || ev.tone === 'ult' ? PAL.gold : ev.tone === 'level' || ev.tone === 'xp' ? '#b6f5a6' : PAL.parchment;
          ctx.font = ev.tone === 'ult' ? 'bold 15px Georgia, serif' : 'bold 12px Georgia, serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(17,26,47,0.85)';
          const ty = y - age / 40 - f.slot * 15;
          ctx.strokeText(ev.text, x, ty);
          ctx.fillStyle = color;
          ctx.fillText(ev.text, x, ty);
          break;
        }
      }
      ctx.restore();
    }
  }

  private drawUltBursts(ctx: CanvasRenderingContext2D, l: Layout, now: number): void {
    for (const u of this.ults) {
      if (now - u.start > ULT_BURST_MS) continue;
      // Enemy ultimates in the fog still get a banner, but not their map effect (except Senja's dusk).
      if (u.owner !== 0 && u.hero !== 'senja' && !this.seen(u.x, u.y)) continue;
      drawUltBurst(ctx, l, u, now);
    }
  }

  private drawUltBanners(ctx: CanvasRenderingContext2D, l: Layout, now: number): void {
    this.ults = this.ults.filter((u) => now - u.start < Math.max(ULT_BANNER_MS, ULT_BURST_MS));
    const live = this.ults.filter((u) => now - u.start < ULT_BANNER_MS).slice(-2);
    live.forEach((u, i) => drawUltBanner(ctx, l, u, now, u.owner === 0, i, l.dpr));
  }

  // ---------- hero orders: the ring and aiming (DEC-021) ----------

  /** The chosen hero's ring on the map, and while aiming an order, every valid target lit up. */
  private drawCommandTargets(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, ui: UiState, alpha: number, now: number): void {
    const kind = ui.command?.hero ?? (ui.ring && !ui.ring.pending ? ui.ring.hero : null);
    if (!kind) return;
    const h = sim.heroOf(0, kind);
    const pulse = 0.5 + 0.5 * Math.sin(now / 160);
    if (h && h.alive) {
      const [x, y] = toScreen(l, ...this.pos(h, alpha));
      const g = this.grow(l);
      ctx.save();
      ctx.strokeStyle = PAL.gold;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.6 + 0.4 * pulse;
      ctx.beginPath(); ctx.ellipse(x, y + 1, 21 * g, 8 * g, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const cmd = ui.command;
    if (!cmd) return;
    const action = cmd.action;
    const targets = commandTargets(sim, cmd.hero, action);
    // the aim point while the finger is still down: a little above it, so the finger doesn't hide it
    const aim = ui.aim ? { x: ui.aim.x, y: ui.aim.y - DRAG_LIFT } : null;
    let near: (typeof targets)[number] | null = null;
    if (aim) {
      let best = 44 * 44;
      for (const t of targets) {
        const [x, y] = toScreen(l, t.x, t.y);
        const d = (x - aim.x) ** 2 + (y - aim.y) ** 2;
        if (d < best) { best = d; near = t; }
      }
    }
    ctx.save();
    ctx.fillStyle = 'rgba(20,12,6,0.22)';
    ctx.fillRect(l.field.x, l.field.y, l.field.w, l.field.h);
    if (action === 'push' || action === 'gank') {
      // the lanes themselves light up: tap anywhere on one
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = LANE_HALF * 2 * l.scale;
      ctx.strokeStyle = action === 'push' ? `rgba(240,147,43,${0.28 + 0.12 * pulse})` : `rgba(229,83,75,${0.28 + 0.12 * pulse})`;
      for (const id of sim.lanes) { this.lanePath(ctx, l, id); ctx.stroke(); }
    }
    for (const t of targets) {
      const [x, y] = toScreen(l, t.x, t.y);
      const e = t.ent;
      const on = near === t;
      if (action === 'attack' && e && e.kind !== 'camp') {
        // red rings round every enemy you can go after
        const r = e.kind === 'tower' || e.kind === 'core' ? Math.max(16, e.r * l.scale * 1.2) : 13 * this.grow(l);
        const cy = e.kind === 'unit' || e.kind === 'hero' ? y - 10 * this.grow(l) : y;
        ctx.strokeStyle = on ? PAL.gold : `rgba(229,83,75,${0.65 + 0.35 * pulse})`;
        ctx.lineWidth = on ? 3.5 : 2.5;
        ctx.beginPath(); ctx.arc(x, cy, on ? r + 3 : r, 0, Math.PI * 2); ctx.stroke();
        continue;
      }
      const icon = COMMAND_ORDERS.find((o) => o.id === action)?.icon ?? '•';
      ctx.fillStyle = on ? PAL.gold : 'rgba(27,39,66,0.9)';
      ctx.strokeStyle = PAL.gold;
      ctx.lineWidth = 2 + pulse;
      ctx.beginPath(); ctx.arc(x, y, on ? 17 : 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      label(ctx, e?.kind === 'camp' && action === 'attack' ? '✦' : icon, x, y + 1, on ? INK : PAL.gold, 13);
    }
    if (aim) {
      // the hero's portrait on the aim point, and what letting go there will do
      ctx.strokeStyle = PAL.paperEdge;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(aim.x, aim.y, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      drawPortrait(ctx, cmd.hero, aim.x, aim.y - 20, 12, 0, l.dpr);
      if (near) pill(ctx, near.label, aim.x, aim.y + 18, true);
      else if (action === 'move') pill(ctx, 'Move here', aim.x, aim.y + 18, true);
    }
    ctx.restore();
  }

  /** While aiming an order: the hint and Cancel, in the lane-chip row (nothing covers the map). */
  private drawAimHint(ctx: CanvasRenderingContext2D, l: Layout, ui: UiState): void {
    const cmd = ui.command;
    if (!cmd) return;
    const m = l.menu;
    const r = m.hint;
    const o = COMMAND_ORDERS.find((x) => x.id === cmd.action);
    ctx.save();
    cardShadow(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fillStyle = 'rgba(27,39,66,0.97)';
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 1.5;
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill(); ctx.stroke();
    drawPortrait(ctx, cmd.hero, r.x + 14, r.y + r.h / 2, 10, 0, l.dpr);
    ctx.fillStyle = PAL.parchment;
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fit(ctx, `${o?.icon ?? ''} ${o?.label ?? ''}: ${o?.hint ?? ''}`, m.cancel.x - r.x - 34), r.x + 28, r.y + r.h / 2 + 0.5);
    const c = m.cancel;
    ctx.fillStyle = PAL.wood;
    ctx.strokeStyle = PAL.paperEdge;
    roundRect(ctx, c.x + 2, c.y + 2, c.w - 4, c.h - 4, 7);
    ctx.fill(); ctx.stroke();
    label(ctx, 'Cancel', c.x + c.w / 2, c.y + c.h / 2 + 0.5, PAL.parchment, 12);
    ctx.restore();
  }

  /** The ring of orders round the thumb (DEC-021): paper discs, the hero's best order marked ★,
   *  the order under the finger raised in gold, and its name above the ring. */
  private drawRing(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, ui: UiState, now: number): void {
    const ring = ui.ring;
    if (!ring || ring.pending) return;
    const def = HEROES[ring.hero];
    const { ringR: R, iconR } = l.menu;
    const open = Math.min(1, (now - ring.at) / 120); // a quick fan-out
    const n = COMMAND_ORDERS.length;
    ctx.save();
    // a soft indigo backing so the discs read on any part of the board
    ctx.fillStyle = `rgba(17,26,47,${0.42 * open})`;
    ctx.beginPath(); ctx.arc(ring.cx, ring.cy, (R + iconR + 6) * (0.6 + 0.4 * open), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(251,247,236,0.55)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    drawPortrait(ctx, ring.hero, ring.cx, ring.cy, 14, 0, l.dpr);
    COMMAND_ORDERS.forEach((o, i) => {
      const [sx, sy] = ringSlot(l, ring.cx, ring.cy, i, n);
      const x = ring.cx + (sx - ring.cx) * (0.55 + 0.45 * open);
      const y = ring.cy + (sy - ring.cy) * (0.55 + 0.45 * open);
      const sel = ring.sel === o.id;
      const best = def.best === o.id;
      const r = sel ? iconR + 4 : iconR;
      // paper disc: crisp shadow, white cut edge, fill
      ctx.fillStyle = 'rgba(5,8,20,0.45)';
      ctx.beginPath(); ctx.arc(x + 1.2, y + 2, r + 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PAL.paperEdge;
      ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = sel ? PAL.gold : PAL.parchment;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (best) { ctx.strokeStyle = PAL.goldDark; ctx.lineWidth = 2; ctx.stroke(); }
      label(ctx, o.icon, x, y - 4, o.id === 'attack' ? PAL.foe : PAL.maroon, sel ? 15 : 13);
      ctx.font = `bold ${sel ? 8 : 7.5}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = INK;
      ctx.fillText(best ? `★${o.label}` : o.label, x, y + 9);
    });
    // what the finger is on, or how to use the ring
    const h = sim.heroOf(0, ring.hero);
    const o = COMMAND_ORDERS.find((x) => x.id === ring.sel);
    const text = o ? (o.id === 'retreat' ? 'Retreat: let go to send home' : `${o.label}: let go, or slide on to the target`)
      : ring.sticky ? `${def.name}: tap an order` : `${def.name}${h ? ` · ${orderLabel(h, sim)}` : ''}: slide to an order`;
    pill(ctx, text, ring.cx, Math.max(l.field.y + 12, ring.cy - R - iconR - 16), true);
    ctx.restore();
  }

  /** The zoom button in the field's corner (DEC-016, DEC-019): − to see the whole map, + to come back in. */
  private drawZoomButton(ctx: CanvasRenderingContext2D, l: Layout): void {
    const r = l.zoomBtn;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const zoomed = l.scale > l.baseScale * 1.01;
    ctx.save();
    ctx.fillStyle = 'rgba(27,39,66,0.82)';
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r.w / 2 - 1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // a magnifying glass with + or −
    ctx.strokeStyle = PAL.parchment;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 6.5, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + 3, cy + 3); ctx.lineTo(cx + 8, cy + 8); ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(cx - 5.5, cy - 2); ctx.lineTo(cx + 1.5, cy - 2);
    if (!zoomed) { ctx.moveTo(cx - 2, cy - 5.5); ctx.lineTo(cx - 2, cy + 1.5); }
    ctx.stroke();
    ctx.restore();
  }

  // ---------- top bar and HUD ----------

  private drawTop(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim): void {
    const t = l.top;
    ctx.fillStyle = 'rgba(10,15,30,0.45)';
    ctx.fillRect(t.x, t.y, t.w, t.h);
    songket(ctx, t.x, t.y + t.h - 6, t.w, 6);
    const left = Math.ceil(sim.timeLeft() / TICKS_PER_SECOND);
    const mm = Math.floor(left / 60);
    const ss = String(left % 60).padStart(2, '0');
    const sudden = sim.phase() === 'sudden';
    const midY = 16;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.fillStyle = sudden ? PAL.foeLight : PAL.parchment;
    const timeText = sudden ? `Sudden death ${mm}:${ss}` : `${mm}:${ss}`;
    ctx.fillText(timeText, t.x + 12, midY);
    if (sudden && !sim.result) {
      ctx.font = 'bold 10px system-ui';
      ctx.fillStyle = PAL.foeLight;
      ctx.fillText(`towers take ×${MATCH.suddenTowerDamagePercent / 100} damage`, t.x + 12, midY + 13);
      ctx.font = 'bold 16px Georgia, serif';
    }
    ctx.textAlign = 'center';
    const cx = t.x + t.w / 2;
    ctx.fillStyle = PAL.youLight;
    ctx.fillText(String(sim.players[0].towersDestroyed), cx - 16, midY);
    ctx.fillStyle = PAL.parchment;
    ctx.fillText('–', cx, midY);
    ctx.fillStyle = PAL.foeLight;
    ctx.fillText(String(sim.players[1].towersDestroyed), cx + 16, midY);
    ctx.font = '10px Georgia, serif';
    ctx.fillStyle = PAL.parchmentDark;
    ctx.fillText('towers taken', cx, midY + 12);
    label(ctx, '⚙', l.gear.x + l.gear.w / 2, l.gear.y + l.gear.h / 2, PAL.parchment, 21);

    // Tower health strip (DEC-013): your towers and Pusaka on the left, the bot's on the right.
    const r = l.towers;
    const half = (r.w - 10) / 2;
    for (const p of [0, 1] as const) {
      const x0 = r.x + p * (half + 10);
      const list: { name: string; e: Ent | undefined }[] = [
        ...sim.lanes.map((id) => ({ name: ['L', 'M', 'R'][id], e: sim.towerOf(p, id) })),
        { name: 'P', e: sim.coreOf(p) },
      ];
      const segW = (half - 3 * (list.length - 1)) / list.length;
      list.forEach(({ name, e }, i) => {
        const x = x0 + i * (segW + 3);
        towerPip(ctx, x, r.y, segW, r.h - 4, name, e, p);
      });
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, ui: UiState): void {
    const hudY = l.waves[0].y - 8;
    // indigo batik cloth (already behind everything), darkened towards the bottom, with a songket edge
    const g = ctx.createLinearGradient(0, hudY, 0, l.h);
    g.addColorStop(0, 'rgba(10,15,30,0.25)');
    g.addColorStop(1, 'rgba(10,15,30,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(l.col.x, hudY, l.col.w, l.h - hudY);
    songket(ctx, l.col.x, hudY, l.col.w, 6);
    const pl = sim.players[0];

    // Lane wave chips (DEC-008): tap to change the class marching in that lane.
    l.waves.forEach((r, lane) => {
      const active = sim.lanes.includes(lane as 0 | 1 | 2);
      const cls = CLASSES[pl.laneClass[lane]];
      ctx.save();
      ctx.globalAlpha = active ? 1 : 0.35;
      cardShadow(ctx, r.x, r.y, r.w, r.h, 7);
      ctx.fillStyle = PAL.parchment;
      ctx.strokeStyle = SPECIES_COLORS[pl.species];
      ctx.lineWidth = 2;
      roundRect(ctx, r.x, r.y, r.w, r.h, 7);
      ctx.fill(); ctx.stroke();
      drawTroopFigure(ctx, cls.unit, r.x + 14, r.y + r.h - 3, 17, 0, l.dpr, { facing: 1, walk: 0, attack: 0, flying: UNITS[cls.unit].flying });
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 9px system-ui';
      ctx.fillText(`${['LEFT', 'MID', 'RIGHT'][lane]} ×${cls.wave}  ▸`, r.x + 28, r.y + 7.5);
      ctx.font = 'bold 11px Georgia, serif';
      ctx.fillText(fit(ctx, active ? cls.name : 'no lane', r.w - 31), r.x + 28, r.y + r.h - 7);
      ctx.restore();
    });

    pl.picks.forEach((kind, i) => {
      const p = l.heroes[i];
      if (p) this.drawHeroPanel(ctx, l, sim, ui, kind, p);
    });

    // Semangat and the shop
    const m = l.mana;
    const value = pl.mana / MANA.perMana;
    ctx.save();
    ctx.fillStyle = 'rgba(17,26,47,0.6)';
    roundRect(ctx, m.x, m.y, m.w, m.h, 8);
    ctx.fill();
    gem(ctx, m.x + 16, m.y + m.h / 2, 9);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillStyle = '#e7c6ff';
    ctx.fillText(String(Math.floor(value)), m.x + 30, m.y + m.h / 2 + 1);
    const nw = ctx.measureText(String(Math.floor(value))).width;
    ctx.font = '11px Georgia, serif';
    ctx.fillStyle = PAL.parchmentDark;
    const sub = sim.doubleMana() && !sim.result ? `${MANA.name} · ×2 now` : pl.halfPrice ? `${MANA.name} · next item ½` : MANA.name;
    ctx.fillText(fit(ctx, sub, m.w - nw - 44), m.x + 36 + nw, m.y + m.h / 2 - 5);
    // progress to the next one
    const bx = m.x + 36 + nw;
    const bw = Math.max(20, m.w - (bx - m.x) - 10);
    ctx.fillStyle = '#3a2a3f';
    ctx.fillRect(bx, m.y + m.h / 2 + 5, bw, 4);
    ctx.fillStyle = '#b06ce0';
    ctx.fillRect(bx, m.y + m.h / 2 + 5, bw * (pl.mana >= MANA.max ? 1 : value - Math.floor(value)), 4);
    ctx.restore();

    const s = l.shop;
    const canBuy = pl.picks.some((k) => (Object.keys(ITEMS) as ItemId[]).some((it) => !sim.cantBuy(0, k, it)));
    ctx.save();
    cardShadow(ctx, s.x, s.y, s.w, s.h, 9);
    ctx.fillStyle = canBuy ? PAL.gold : PAL.wood;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    roundRect(ctx, s.x, s.y, s.w, s.h, 9);
    ctx.fill(); ctx.stroke();
    if (canBuy) {
      ctx.strokeStyle = `rgba(255,240,190,${0.4 + 0.4 * Math.sin(this.now / 300)})`;
      ctx.lineWidth = 2;
      roundRect(ctx, s.x - 2, s.y - 2, s.w + 4, s.h + 4, 11);
      ctx.stroke();
    }
    label(ctx, 'Shop', s.x + s.w / 2 + 8, s.y + s.h / 2 + 1, canBuy ? INK : PAL.parchment, 15);
    bag(ctx, s.x + 22, s.y + s.h / 2, canBuy ? INK : PAL.parchment);
    ctx.restore();
  }

  private drawHeroPanel(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, ui: UiState, kind: HeroKind, p: HeroPanel): void {
    const def = HEROES[kind];
    const h = sim.heroOf(0, kind);
    const sel = ui.command?.hero === kind || ui.ring?.hero === kind;
    const b = p.box;
    ctx.save();
    cardShadow(ctx, b.x, b.y, b.w, b.h, 9);
    ctx.fillStyle = PAL.parchment;
    ctx.strokeStyle = sel ? PAL.gold : INK;
    ctx.lineWidth = sel ? 3 : 1.5;
    roundRect(ctx, b.x, b.y, b.w, b.h, 9);
    ctx.fill(); ctx.stroke();
    // PLAN-013: the panel flashes red when its hero is hit
    const hurtAgo = h ? this.now - (this.anim.get(h.id)?.hurtAt ?? -1e9) : 1e9;
    if (hurtAgo < 450) {
      ctx.strokeStyle = `rgba(192,57,43,${0.9 * (1 - hurtAgo / 450)})`;
      ctx.lineWidth = 3;
      roundRect(ctx, b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3, 8);
      ctx.stroke();
    }
    // portrait with the power ring
    const pr = p.portrait.w / 2 - 3;
    const pc = { x: p.portrait.x + p.portrait.w / 2, y: p.portrait.y + p.portrait.h / 2 };
    const alive = !!h && h.alive;
    ctx.globalAlpha = alive ? 1 : 0.45;
    drawPortrait(ctx, kind, pc.x, pc.y, pr, 0, l.dpr);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ORDER_COLORS[def.best];
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(pc.x, pc.y, pr + 0.5, 0, Math.PI * 2); ctx.stroke();
    if (h && alive) {
      const ready = 1 - Math.min(1, h.powerCd / Math.max(1, def.powerTicks));
      ctx.strokeStyle = ready >= 1 ? PAL.gold : PAL.woodLight;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(pc.x, pc.y, pr + 3, -Math.PI / 2, -Math.PI / 2 + ready * Math.PI * 2); ctx.stroke();
    } else if (h) {
      label(ctx, `${Math.ceil(h.respawn / TICKS_PER_SECOND)}s`, pc.x, pc.y, PAL.parchment, 13);
    }
    // name and level beside the portrait; health and order below
    const tx = p.portrait.x + p.portrait.w + 4;
    const tw = b.x + b.w - tx - 4;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText(fit(ctx, def.name, tw), tx, b.y + 13);
    ctx.font = 'bold 9.5px system-ui';
    ctx.fillStyle = PAL.maroon;
    ctx.fillText(h ? `Lv${h.level}${h.fury > 0 ? ' ✹' : ''}` : '', tx, b.y + 28);
    if (h) {
      const f = alive ? h.hp / h.maxHp : 0;
      const bx = b.x + 5;
      const bw = b.w - 10;
      ctx.fillStyle = 'rgba(17,26,47,0.25)';
      ctx.fillRect(bx, b.y + 44, bw, 5);
      ctx.fillStyle = f > 0.5 ? '#3f9a54' : f > 0.25 ? '#d49b2a' : '#c0392b';
      ctx.fillRect(bx, b.y + 44, bw * f, 5);
      ctx.font = '9.5px system-ui';
      ctx.fillStyle = '#5a4630';
      // what the hero is doing, including when it acts on its own (DEC-017)
      const foe = h.atkCd > 0 && h.targetId ? sim.get(h.targetId) : undefined;
      const fighting = foe && foe.alive && foe.kind === 'hero' ? `⚔ vs ${HEROES[foe.hero as HeroKind].name}` : '';
      const doing = h.fallback ? 'Healing at home' : fighting || (h.waiting ? `${orderLabel(h, sim)} · waiting for troops` : orderLabel(h, sim));
      const order = alive ? `${doing}${h.hidden ? ' · hidden' : ''}` : 'Down';
      ctx.fillText(fit(ctx, order, bw), bx, b.y + 56);
    }
    // item slots
    p.items.forEach((r, k) => {
      const it = h?.items[k];
      ctx.save();
      if (it) {
        ctx.fillStyle = '#efe0bb';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2;
        roundRect(ctx, r.x, r.y, r.w, r.h, 5);
        ctx.fill(); ctx.stroke();
        itemIcon(ctx, it, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.36);
      } else if (k < ITEM_SLOTS) {
        ctx.strokeStyle = PAL.woodLight;
        ctx.setLineDash([3, 2]);
        ctx.lineWidth = 1.2;
        roundRect(ctx, r.x, r.y, r.w, r.h, 5);
        ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, '+', r.x + r.w / 2, r.y + r.h / 2, PAL.woodLight, 12);
      }
      ctx.restore();
    });
    // the ULT button (DEC-011)
    this.drawUltButton(ctx, sim, kind, h, p.ult);
    ctx.restore();
  }

  private drawUltButton(ctx: CanvasRenderingContext2D, sim: Sim, kind: HeroKind, h: Ent | undefined, r: Rect): void {
    const passive = kind === 'belang';
    let state: 'locked' | 'on' | 'ready' | 'now' | 'called' | 'used' | 'down';
    if (!h || h.level < 4) state = 'locked';
    else if (passive) state = 'on';
    else if (!h.alive) state = 'down';
    else if (!h.ultReady) state = 'used';
    else if (h.ultArmed) state = 'called';
    else if (sim.ultSuggested(h)) state = 'now';
    else state = 'ready';
    const pulse = 0.5 + 0.5 * Math.sin(this.now / 150);
    ctx.save();
    const fill = { locked: '#6b5a48', on: PAL.gold, ready: '#f3dfa6', now: PAL.gold, called: PAL.maroon, used: '#8a7a68', down: '#8a7a68' }[state];
    ctx.fillStyle = fill;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill(); ctx.stroke();
    if (state === 'now' || state === 'called') {
      ctx.strokeStyle = state === 'now' ? `rgba(255,248,214,${0.5 + 0.5 * pulse})` : `rgba(224,176,74,${0.5 + 0.5 * pulse})`;
      ctx.lineWidth = 3;
      roundRect(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 10);
      ctx.stroke();
    }
    const text = { locked: 'ULT Lv4', on: 'ULT ON', ready: 'ULT', now: 'ULT NOW', called: 'CALLED', used: 'USED', down: 'ULT' }[state];
    const color = state === 'called' ? PAL.gold : state === 'locked' || state === 'used' || state === 'down' ? '#e2cf9f' : INK;
    label(ctx, text, r.x + r.w / 2, r.y + r.h / 2 + 0.5, color, state === 'now' || state === 'called' ? 10.5 : 11);
    ctx.restore();
  }

  private drawToast(ctx: CanvasRenderingContext2D, l: Layout, text: string, y: number): void {
    ctx.save();
    ctx.font = 'bold 14px Georgia, serif';
    const w = ctx.measureText(text).width + 28;
    const x = l.col.x + l.col.w / 2 - w / 2;
    ctx.fillStyle = 'rgba(27,39,66,0.92)';
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, 30, 15);
    ctx.fill(); ctx.stroke();
    label(ctx, text, l.col.x + l.col.w / 2, y + 15, PAL.parchment, 14);
    ctx.restore();
  }}

// ---------- small drawing helpers ----------

/** The world points (and radii) you can see from (DEC-012), matching Sim.sees. */
function visionCircles(sim: Sim): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const e of sim.ents) {
    if (!e.alive || e.owner !== 0) continue;
    const r = sim.visionOf(e);
    if (r > 0) out.push([e.x, e.y, r]);
  }
  for (const z of sim.zones) if (z.kind === 'lantern' && z.owner === 0) out.push([z.x, z.y, z.r]);
  return out;
}

/** A tower's big health bar with its number (DEC-013). */
function bigHealthBar(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, hp: number, max: number, owner: number, shield: number): void {
  const f = Math.max(0, Math.min(1, hp / max));
  const c = teamColors(owner);
  const h = 9;
  ctx.save();
  ctx.fillStyle = 'rgba(17,26,47,0.9)';
  roundRect(ctx, cx - w / 2 - 1.5, y - h / 2 - 1.5, w + 3, h + 3, 4);
  ctx.fill();
  ctx.fillStyle = f > 0.5 ? c.base : f > 0.25 ? '#d49b2a' : '#e5534b';
  ctx.fillRect(cx - w / 2, y - h / 2, w * f, h);
  if (shield > 0) {
    ctx.fillStyle = 'rgba(234,246,255,0.8)';
    ctx.fillRect(cx - w / 2, y - h / 2, Math.min(w, (w * shield) / max), 3);
  }
  ctx.font = 'bold 8.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(17,26,47,0.95)';
  const t = String(Math.max(0, Math.ceil(hp)));
  ctx.strokeText(t, cx, y + 0.5);
  ctx.fillStyle = '#fff8e6';
  ctx.fillText(t, cx, y + 0.5);
  ctx.restore();
}

/** One tower in the top strip: its letter and health, crossed out once it falls. */
function towerPip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, name: string, e: Ent | undefined, owner: 0 | 1): void {
  const c = teamColors(owner);
  const alive = !!e && e.alive;
  const f = alive && e ? Math.max(0, e.hp / e.maxHp) : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  if (alive) {
    ctx.fillStyle = f > 0.5 ? c.base : f > 0.25 ? '#d49b2a' : '#e5534b';
    ctx.save();
    roundRect(ctx, x, y, w, h, 4);
    ctx.clip();
    ctx.fillRect(x, y, w * f, h);
    ctx.restore();
  }
  ctx.strokeStyle = owner === 0 ? PAL.youLight : PAL.foeLight;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 4);
  ctx.stroke();
  ctx.font = 'bold 9.5px system-ui';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = alive ? '#fff8e6' : '#a8957c';
  ctx.fillText(alive ? `${name} ${Math.ceil(f * 100)}%` : `${name} ✕`, x + w / 2, y + h / 2 + 0.5);
  ctx.restore();
}

/** A small banner on a pole: where a hero was sent to hold. */
function flag(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 16); ctx.stroke();
  ctx.fillStyle = PAL.gold;
  ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + 10, y - 12.5); ctx.lineTo(x, y - 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(17,26,47,0.4)';
  ctx.beginPath(); ctx.ellipse(x, y, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function gem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.fillStyle = '#8e4fc4';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.45, y - r * 0.2); ctx.lineTo(x - r * 0.2, y - r * 0.2); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function bag(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = 'transparent';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 3); ctx.lineTo(x + 7, y - 3); ctx.lineTo(x + 8, y + 8); ctx.lineTo(x - 8, y + 8); ctx.closePath();
  ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y - 4, 4, Math.PI, 0); ctx.stroke();
  ctx.restore();
}

/** A tiny picture for each item (DEC-011). */
export function itemIcon(ctx: CanvasRenderingContext2D, id: ItemId, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 10, s / 10);
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  switch (id) {
    case 'keris': // wavy dagger
      ctx.fillStyle = '#c9ccd2';
      ctx.beginPath(); ctx.moveTo(-1.5, 4); ctx.quadraticCurveTo(-4, 0, -1, -3); ctx.quadraticCurveTo(2, -6, 0, -10); ctx.quadraticCurveTo(4, -6, 2, -3); ctx.quadraticCurveTo(4, 0, 1.5, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAL.woodLight;
      ctx.fillRect(-4, 4, 8, 2.5); ctx.strokeRect(-4, 4, 8, 2.5);
      ctx.fillStyle = PAL.gold; ctx.fillRect(-1.5, 6.5, 3, 4); ctx.strokeRect(-1.5, 6.5, 3, 4);
      break;
    case 'baju': // chain vest
      ctx.fillStyle = '#9aa0a8';
      ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-3, -9); ctx.lineTo(0, -6); ctx.lineTo(3, -9); ctx.lineTo(8, -6); ctx.lineTo(7, 9); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(17,26,47,0.5)';
      ctx.lineWidth = 0.8;
      for (const yy of [-2, 2, 6]) { ctx.beginPath(); ctx.moveTo(-6, yy); ctx.lineTo(6, yy); ctx.stroke(); }
      break;
    case 'capal': // winged sandal
      ctx.fillStyle = PAL.clayLight;
      ctx.beginPath(); ctx.ellipse(1, 4, 8, 3.5, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f3e6c4';
      ctx.beginPath(); ctx.moveTo(-6, 1); ctx.quadraticCurveTo(-10, -8, -2, -6); ctx.quadraticCurveTo(-5, -3, -2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'tangkal': // amulet on a cord
      ctx.beginPath(); ctx.arc(0, -4, 6, Math.PI * 0.1, Math.PI * 0.9, true); ctx.stroke();
      ctx.fillStyle = PAL.gold;
      ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(6, 8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAL.maroon;
      ctx.beginPath(); ctx.arc(0, 5, 1.8, 0, Math.PI * 2); ctx.fill();
      break;
    case 'jamu': // tonic bottle
      ctx.fillStyle = '#6fae4a';
      ctx.beginPath(); ctx.moveTo(-2.5, -8); ctx.lineTo(2.5, -8); ctx.lineTo(2.5, -4); ctx.quadraticCurveTo(7, -2, 7, 3); ctx.quadraticCurveTo(7, 9, 0, 9); ctx.quadraticCurveTo(-7, 9, -7, 3); ctx.quadraticCurveTo(-7, -2, -2.5, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAL.woodLight; ctx.fillRect(-2.5, -10, 5, 2.5); ctx.strokeRect(-2.5, -10, 5, 2.5);
      break;
    case 'rotan': // woven shield
      ctx.fillStyle = '#c9a15e';
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(17,26,47,0.55)';
      ctx.lineWidth = 0.9;
      for (const rr of [3, 6]) { ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke();
      break;
    case 'gelang': // twin bangles
      ctx.strokeStyle = PAL.goldDark;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(-2, 1, 6, 6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = PAL.gold;
      ctx.beginPath(); ctx.ellipse(3, -1, 6, 6, 0, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'pelita': // oil lamp
      ctx.fillStyle = PAL.clay;
      ctx.beginPath(); ctx.moveTo(-8, 2); ctx.quadraticCurveTo(0, 10, 8, 2); ctx.lineTo(5, 2); ctx.lineTo(-8, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd36a';
      ctx.beginPath(); ctx.moveTo(4, 1); ctx.quadraticCurveTo(9, -5, 5, -9); ctx.quadraticCurveTo(3, -4, 4, 1); ctx.fill();
      break;
  }
  ctx.restore();
}

/** A crisp paper shadow under a card (an offset copy; cheap enough for every frame). */
function cardShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,20,0.5)';
  roundRect(ctx, x + 1.5, y + 2.5, w, h, r);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size: number): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, on: boolean): void {
  ctx.save();
  ctx.font = 'bold 10px system-ui';
  const w = ctx.measureText(text).width + 10;
  ctx.fillStyle = on ? PAL.gold : 'rgba(27,39,66,0.9)';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  roundRect(ctx, x - w / 2, y - 7, w, 14, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = on ? INK : PAL.parchment;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

function hpBar(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, frac: number, color: string): void {
  const f = Math.max(0, Math.min(1, frac));
  ctx.save();
  ctx.fillStyle = 'rgba(17,26,47,0.75)';
  ctx.fillRect(cx - w / 2 - 1, y - 2.5, w + 2, 5);
  ctx.fillStyle = color;
  ctx.fillRect(cx - w / 2, y - 1.5, w * f, 3);
  ctx.restore();
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}
