// Drawing only. Reads the match state and the UI state; never changes the rules.
import { CAMPS, FIELD, LANES, LANE_HALF, RIVER, inJungle, pointAt } from '../game/map';
import { Rng } from '../game/math';
import { CARDS, DEPLOY, HEROES, MANA, MATCH, TICKS_PER_SECOND, UNITS, type CardId, type HeroKind } from '../game/rules';
import type { Ent, GameEvent, Sim } from '../game/sim';
import { type Layout, type Rect, toScreen } from './layout';
import { type OrderTarget, orderLabel, orderTargets, placeCard } from './placement';

export const COLORS = {
  you: '#2e86de', youLight: '#7cc4ff', youDark: '#1b5fa8',
  foe: '#e74c3c', foeLight: '#ff8a80', foeDark: '#a93226',
  neutral: '#7a5c2e', accent: '#ffd166', mana: '#b06ce0',
  jungle: '#2f5d3a', tree: '#244a2e', lane: '#c9b78f', bridge: '#a08a5c', river: '#4f8fbf',
  hud: '#16211a', ink: '#f3efe4', muted: '#a9b3a6', card: '#e9e2cf', spell: '#d9c8ee', hero: '#f6e3a6',
} as const;

/** Ring colour of a hero = its best order. */
export const ORDER_COLORS: Record<'push' | 'defend' | 'gank' | 'farm', string> = {
  push: '#ff9f43', defend: '#54a0ff', gank: '#ff6b6b', farm: '#7bd389',
};

export interface UiState {
  dragCard: { index: number; card: CardId; x: number; y: number; moved: boolean } | null;
  selectedCard: number;
  dragHero: { hero: HeroKind; x: number; y: number; moved: boolean } | null;
  selectedHero: HeroKind | null;
  hover: { x: number; y: number } | null;
  toast: { text: string; until: number } | null;
}

interface Fx { ev: GameEvent; born: number; slot: number }

export const DRAG_LIFT = 28; // dragged cards preview a little above the finger

export class Renderer {
  private fx: Fx[] = [];
  private trees: { x: number; y: number; r: number }[] = [];
  private treesFor = 0;
  private lastSeen = new Map<number, { x: number; y: number; at: number }>();
  private showRanges = false;

  addEvents(evs: GameEvent[], now: number): void {
    for (const ev of evs) {
      // Stack pop-up texts that appear at the same place at the same time, so they don't overlap.
      let slot = 0;
      if (ev.k === 'text') {
        for (const f of this.fx) {
          if (f.ev.k === 'text' && now - f.born < 800 && Math.abs(f.ev.x - ev.x) < 600 && Math.abs(f.ev.y - ev.y) < 400) slot = Math.max(slot, f.slot + 1);
        }
      }
      this.fx.push({ ev, born: now, slot });
    }
    if (this.fx.length > 400) this.fx.splice(0, this.fx.length - 400);
  }

  reset(): void {
    this.fx = [];
    this.lastSeen.clear();
  }

  draw(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, ui: UiState, alpha: number, now: number): void {
    ctx.save();
    ctx.setTransform(l.dpr, 0, 0, l.dpr, 0, 0);
    ctx.fillStyle = '#0f1612';
    ctx.fillRect(0, 0, l.w, l.h);
    this.showRanges = ui.dragCard !== null || ui.selectedCard >= 0;
    this.drawField(ctx, l, sim);
    this.drawPreview(ctx, l, sim, ui);
    this.drawEnts(ctx, l, sim, alpha, now);
    this.drawFx(ctx, l, now);
    this.drawOrderTargets(ctx, l, sim, ui);
    this.drawTop(ctx, l, sim);
    this.drawHud(ctx, l, sim, ui);
    if (ui.toast && ui.toast.until > now) this.drawToast(ctx, l, ui.toast.text);
    ctx.restore();
  }

  // ---------- field ----------

  private drawField(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim): void {
    const f = l.field;
    ctx.fillStyle = COLORS.jungle;
    roundRect(ctx, f.x, f.y, f.w, f.h, 10);
    ctx.fill();
    ctx.save();
    roundRect(ctx, f.x, f.y, f.w, f.h, 10);
    ctx.clip();

    if (this.treesFor !== sim.laneCount) this.makeTrees(sim);
    ctx.fillStyle = COLORS.tree;
    for (const t of this.trees) {
      const [x, y] = toScreen(l, t.x, t.y);
      ctx.beginPath();
      ctx.arc(x, y, t.r * l.scale, 0, Math.PI * 2);
      ctx.fill();
    }

    const [, ry] = toScreen(l, 0, RIVER.y - RIVER.halfWidth);
    ctx.fillStyle = COLORS.river;
    ctx.fillRect(f.x, ry, f.w, RIVER.halfWidth * 2 * l.scale);

    const laneW = LANE_HALF * 2 * l.scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = laneW;
    ctx.strokeStyle = COLORS.lane;
    for (const id of sim.lanes) this.lanePath(ctx, l, id), ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x, ry, f.w, RIVER.halfWidth * 2 * l.scale);
    ctx.clip();
    ctx.strokeStyle = COLORS.bridge;
    for (const id of sim.lanes) this.lanePath(ctx, l, id), ctx.stroke();
    ctx.restore();
    ctx.restore();
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

  private makeTrees(sim: Sim): void {
    const rng = new Rng(7);
    this.trees = [];
    for (let i = 0; i < 400 && this.trees.length < 46; i++) {
      const x = 150 + rng.int(3600);
      const y = FIELD.minY + 150 + rng.int(2700);
      if (Math.abs(y - RIVER.y) < 260) continue;
      if (!inJungle(x, y, sim.lanes) || !inJungle(3900 - x, 6940 - y, sim.lanes)) continue;
      const r = 70 + rng.int(60);
      this.trees.push({ x, y, r }, { x: 3900 - x, y: 6940 - y, r });
    }
    this.treesFor = sim.laneCount;
  }

  private drawPreview(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, ui: UiState): void {
    const index = ui.dragCard ? ui.dragCard.index : ui.selectedCard;
    if (index < 0) return;
    const card = sim.players[0].hand[index];
    if (!card) return;
    const def = CARDS[card];
    // Allowed drop zones.
    if (def.kind !== 'spell') {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = LANE_HALF * 2 * l.scale;
      ctx.strokeStyle = 'rgba(46,134,222,0.28)';
      for (const id of sim.lanes) {
        this.lanePath(ctx, l, id, DEPLOY.minU, sim.maxU(0, id));
        ctx.stroke();
      }
      ctx.restore();
    }
    const pt = ui.dragCard && ui.dragCard.moved ? { x: ui.dragCard.x, y: ui.dragCard.y - DRAG_LIFT } : ui.dragCard ? null : ui.hover;
    if (!pt || !inRectLoose(l.field, pt.x, pt.y)) return;
    const [wx, wy] = [FIELD.minX + (pt.x - l.field.x) / l.scale, FIELD.minY + (pt.y - l.field.y) / l.scale];
    const p = placeCard(sim, card, wx, wy);
    const [sx, sy] = toScreen(l, p.x, p.y);
    ctx.save();
    ctx.globalAlpha = 0.75;
    if (p.kind === 'spell') {
      ctx.strokeStyle = COLORS.accent;
      ctx.fillStyle = 'rgba(255,140,60,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 250 * l.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      const r = Math.max(9, (def.hero ? HEROES[def.hero].radius : def.unit ? UNITS[def.unit].radius : 60) * l.scale * 1.4);
      ctx.fillStyle = COLORS.youLight;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0b2540';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.count && def.count > 1 ? `×${def.count}` : def.name[0], sx, sy + 0.5);
    }
    ctx.restore();
  }

  // ---------- entities ----------

  private drawEnts(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, alpha: number, now: number): void {
    this.drawZones(ctx, l, sim);
    for (const e of sim.ents) if (e.kind === 'camp') this.drawCamp(ctx, l, e);
    for (const e of sim.ents) if (e.kind === 'tower' || e.kind === 'core') this.drawStructure(ctx, l, sim, e, this.showRanges);
    // own heroes' order lines under units
    for (const e of sim.ents) if (e.kind === 'hero' && e.owner === 0 && e.alive) this.drawOrderLine(ctx, l, sim, e, alpha);
    for (const e of sim.ents) if (e.kind === 'unit' && e.alive) this.drawUnit(ctx, l, e, alpha);
    for (const e of sim.ents) if (e.kind === 'hero') this.drawHero(ctx, l, e, alpha, now);
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
          ctx.strokeStyle = z.owner === 0 ? 'rgba(255,209,102,0.45)' : 'rgba(255,138,128,0.45)';
          ctx.setLineDash([3, 5]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, z.r * l.scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#ffd166';
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,209,102,0.25)';
          ctx.beginPath();
          ctx.arc(x, y, 11, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(225,235,240,0.32)';
          ctx.beginPath();
          ctx.arc(x, y, z.r * l.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Lane-wide effects: tint the lane.
        ctx.globalAlpha = 0.35 * fade;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = LANE_HALF * 2 * l.scale;
        ctx.strokeStyle = z.kind === 'flood' ? '#4f8fbf' : z.owner === 0 ? '#7cc4ff' : '#ff8a80';
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
      if (!o || !o.alive) continue;
      const [x1, y1] = toScreen(l, ...this.pos(e, alpha));
      const [x2, y2] = toScreen(l, ...this.pos(o, alpha));
      ctx.save();
      ctx.strokeStyle = '#ff6b4a';
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1) / 2 + 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Small marks for effects on a unit or hero. */
  private marks(ctx: CanvasRenderingContext2D, e: Ent, x: number, y: number, r: number): void {
    ctx.save();
    if (e.slow > 0) {
      ctx.strokeStyle = '#9be7ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r + 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.shield > 0) {
      ctx.strokeStyle = '#e8f6ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r + 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.charm > 0) {
      ctx.strokeStyle = '#c38bff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.mark > 0) {
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - r - 5, y); ctx.lineTo(x + r + 5, y);
      ctx.moveTo(x, y - r - 5); ctx.lineTo(x, y + r + 5);
      ctx.stroke();
    }
    let icons = '';
    if (e.stun > 0) icons += '✶';
    if (e.silence > 0) icons += '⊘';
    if (e.dot > 0) icons += '•';
    if (e.immune > 0) icons += '◆';
    if (icons) {
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(icons, x, y - r - 12);
      ctx.fillStyle = e.dot > 0 && icons === '•' ? '#8be36b' : '#ffe066';
      ctx.fillText(icons, x, y - r - 12);
    }
    ctx.restore();
  }

  private drawCamp(ctx: CanvasRenderingContext2D, l: Layout, e: Ent): void {
    const [x, y] = toScreen(l, e.x, e.y);
    const r = Math.max(10, e.r * l.scale);
    ctx.save();
    ctx.globalAlpha = e.alive ? 1 : 0.35;
    ctx.fillStyle = COLORS.neutral;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.accent;
    ctx.font = `bold ${Math.round(r * 1.1)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', x, y + 1);
    ctx.restore();
    if (!e.alive) {
      label(ctx, `${Math.ceil(e.respawn / TICKS_PER_SECOND)}s`, x, y + r + 9, COLORS.muted, 10);
    } else if (e.hp < e.maxHp) {
      hpBar(ctx, x, y - r - 6, r * 2.2, e.hp / e.maxHp, COLORS.accent);
    }
  }

  private drawStructure(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, e: Ent, showRange: boolean): void {
    const [x, y] = toScreen(l, e.x, e.y);
    const isCore = e.kind === 'core';
    const w = isCore ? Math.max(40, e.r * 2 * l.scale) : Math.max(22, e.r * 1.9 * l.scale);
    const h = isCore ? w * 0.62 : w;
    const mine = e.owner === 0;
    ctx.save();
    if (!e.alive) {
      ctx.fillStyle = '#555';
      ctx.strokeStyle = '#888';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 2;
      roundRect(ctx, x - w / 2, y - h / 2, w, h, 4);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, '✕', x, y, '#ccc', 14);
      ctx.restore();
      return;
    }
    if (showRange) {
      // Attack range, shown while you place a card.
      ctx.strokeStyle = mine ? 'rgba(124,196,255,0.25)' : 'rgba(255,138,128,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, (e.range + e.r) * l.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = isCore ? (mine ? COLORS.youDark : COLORS.foeDark) : mine ? COLORS.you : COLORS.foe;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 4);
    ctx.fill();
    ctx.stroke();
    if (isCore) label(ctx, 'PUSAKA', x, y + 1, '#fff', 9);
    if (e.shield > 0) {
      ctx.strokeStyle = '#e8f6ff';
      ctx.lineWidth = 3;
      roundRect(ctx, x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, 6);
      ctx.stroke();
    }
    if (e.kind === 'tower' && sim.tick < MATCH.towerShieldUntil) {
      ctx.strokeStyle = 'rgba(255,209,102,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, w * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (e.hp < e.maxHp) hpBar(ctx, x, y - h / 2 - 7, Math.max(w, 30), e.hp / e.maxHp, mine ? COLORS.youLight : COLORS.foeLight);
  }

  private pos(e: Ent, alpha: number): [number, number] {
    return [e.px + (e.x - e.px) * alpha, e.py + (e.y - e.py) * alpha];
  }

  private drawUnit(ctx: CanvasRenderingContext2D, l: Layout, e: Ent, alpha: number): void {
    const [wx, wy] = this.pos(e, alpha);
    const [x, y] = toScreen(l, wx, wy);
    const r = Math.max(e.unit === 'minion' ? 3.5 : 4.5, e.r * l.scale);
    const mine = e.owner === 0;
    ctx.save();
    if (e.deploy > 0) ctx.globalAlpha = 0.45;
    ctx.fillStyle = mine ? COLORS.youLight : COLORS.foeLight;
    if (e.unit === 'minion') ctx.fillStyle = mine ? '#a9d4ff' : '#ffb3ab';
    if (e.unit === 'puppet') ctx.fillStyle = mine ? '#4b3f8f' : '#7a2f45';
    if (e.unit === 'decoy') ctx.globalAlpha *= 0.55;
    if (e.unit === 'watchtower') ctx.fillStyle = '#b8a35a';
    ctx.strokeStyle = mine ? COLORS.youDark : COLORS.foeDark;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    switch (e.unit) {
      case 'archer': // triangle
        ctx.moveTo(x, y - r * 1.2);
        ctx.lineTo(x + r * 1.1, y + r * 0.8);
        ctx.lineTo(x - r * 1.1, y + r * 0.8);
        ctx.closePath();
        break;
      case 'ram': // square
      case 'watchtower':
        ctx.rect(x - r, y - r, r * 2, r * 2);
        break;
      case 'imp': // diamond
        ctx.moveTo(x, y - r * 1.2);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r * 1.2);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        break;
      default:
        ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    if (e.unit === 'shieldbearer') {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.unit === 'watchtower') label(ctx, '⌂', x, y + 0.5, '#3b2f10', Math.round(r * 1.4));
    ctx.restore();
    this.marks(ctx, e, x, y, r);
    if (e.hp < e.maxHp && e.unit !== 'minion') hpBar(ctx, x, y - r - 4, Math.max(12, r * 2.2), e.hp / e.maxHp, mine ? COLORS.youLight : COLORS.foeLight);
  }

  private drawHero(ctx: CanvasRenderingContext2D, l: Layout, e: Ent, alpha: number, now: number): void {
    if (!e.alive) return;
    const mine = e.owner === 0;
    const [wx, wy] = this.pos(e, alpha);
    if (!mine) {
      if (e.hidden) {
        // Enemy hero hidden in the jungle: show only where it was last seen, fading out.
        const seen = this.lastSeen.get(e.id);
        if (seen && now - seen.at < 4000) {
          const [x, y] = toScreen(l, seen.x, seen.y);
          ctx.save();
          ctx.globalAlpha = 0.6 * (1 - (now - seen.at) / 4000);
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath();
          ctx.arc(x, y, 11, 0, Math.PI * 2);
          ctx.fill();
          label(ctx, '?', x, y + 1, '#fff', 14);
          ctx.restore();
        }
        return;
      }
      this.lastSeen.set(e.id, { x: e.x, y: e.y, at: now });
    }
    const [x, y] = toScreen(l, wx, wy);
    const r = Math.max(11, e.r * l.scale * 1.3);
    const def = HEROES[e.hero as HeroKind];
    ctx.save();
    if (e.flying) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(x + 4, y + r + 6, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.ultReady) {
      ctx.strokeStyle = 'rgba(255,209,102,0.55)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.deploy > 0) ctx.globalAlpha = 0.5;
    if (mine && e.hidden) ctx.globalAlpha = 0.6;
    ctx.fillStyle = mine ? COLORS.you : COLORS.foe;
    ctx.strokeStyle = ORDER_COLORS[def.best];
    ctx.lineWidth = 2.5;
    if (mine && e.hidden) ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, def.code, x, y + 1, '#fff', Math.round(r * 0.85));
    // level pip
    ctx.fillStyle = COLORS.accent;
    ctx.beginPath();
    ctx.arc(x + r * 0.8, y + r * 0.8, 6, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, String(e.level), x + r * 0.8, y + r * 0.8 + 0.5, '#1a1a1a', 9);
    ctx.restore();
    this.marks(ctx, e, x, y, r);
    hpBar(ctx, x, y - r - 6, r * 2.4, e.hp / e.maxHp, mine ? COLORS.youLight : COLORS.foeLight);
  }

  private drawOrderLine(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, h: Ent, alpha: number): void {
    let tx: number;
    let ty: number;
    switch (h.order.type) {
      case 'push': return;
      case 'gank': tx = h.goalX; ty = h.goalY; break;
      case 'farm': { const c = CAMPS[h.order.camp]; tx = c[0]; ty = c[1]; break; }
      case 'defend': { const t = sim.towerOf(0, h.order.lane); if (!t) return; tx = t.x; ty = t.y - 250; break; }
      case 'retreat': { const c = sim.coreOf(0); tx = c.x; ty = c.y; break; }
    }
    const [hx, hy] = this.pos(h, alpha);
    const [x1, y1] = toScreen(l, hx, hy);
    const [x2, y2] = toScreen(l, tx, ty);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,209,102,0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- effects ----------

  private drawFx(ctx: CanvasRenderingContext2D, l: Layout, now: number): void {
    this.fx = this.fx.filter((f) => now - f.born < 1100);
    for (const f of this.fx) {
      const age = now - f.born;
      const ev = f.ev;
      ctx.save();
      switch (ev.k) {
        case 'hit': {
          if (age > 160) break;
          const [x1, y1] = toScreen(l, ev.x1, ev.y1);
          const [x2, y2] = toScreen(l, ev.x2, ev.y2);
          ctx.globalAlpha = 1 - age / 160;
          if (ev.ranged) {
            ctx.strokeStyle = ev.owner === 0 ? '#cfe8ff' : ev.owner === 1 ? '#ffd2cc' : '#ffe2a0';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          } else {
            ctx.fillStyle = '#fff6d0';
            ctx.beginPath();
            ctx.arc(x2, y2, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'boom': {
          if (age > 500) break;
          const [x, y] = toScreen(l, ev.x, ev.y);
          const t = age / 500;
          ctx.globalAlpha = 1 - t;
          ctx.fillStyle = 'rgba(255,140,60,0.35)';
          ctx.strokeStyle = '#ffb347';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, ev.r * l.scale * (0.6 + 0.4 * t), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'line': {
          if (age > 260) break;
          const [x1, y1] = toScreen(l, ev.x1, ev.y1);
          const [x2, y2] = toScreen(l, ev.x2, ev.y2);
          ctx.globalAlpha = 1 - age / 260;
          ctx.strokeStyle = ev.owner === 0 ? '#bfe3ff' : '#ffc9c2';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          break;
        }
        case 'death': {
          if (age > 450) break;
          const [x, y] = toScreen(l, ev.x, ev.y);
          ctx.globalAlpha = 1 - age / 450;
          ctx.strokeStyle = ev.owner === 0 ? COLORS.youLight : ev.owner === 1 ? COLORS.foeLight : COLORS.accent;
          ctx.lineWidth = ev.big ? 3 : 1.5;
          ctx.beginPath();
          ctx.arc(x, y, (ev.big ? 14 : 5) + age / 30, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'text': {
          const [x, y] = toScreen(l, ev.x, ev.y);
          ctx.globalAlpha = 1 - age / 1100;
          const color = ev.tone === 'mana' ? '#e3b8ff' : ev.tone === 'ambush' || ev.tone === 'ult' ? '#ffd166' : ev.tone === 'level' ? '#b6f5a6' : '#ffffff';
          ctx.font = ev.tone === 'ult' ? 'bold 15px system-ui' : 'bold 12px system-ui';
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,0.6)';
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

  private drawOrderTargets(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, ui: UiState): void {
    const kind = ui.dragHero ? ui.dragHero.hero : ui.selectedHero;
    if (!kind) return;
    const hero = sim.heroOf(0, kind);
    const targets = orderTargets(sim, hero);
    const dragging = ui.dragHero !== null && ui.dragHero.moved;
    const pt = dragging ? ui.dragHero : ui.hover;
    const near = pt ? nearestTarget(l, targets, pt.x, pt.y - (dragging ? DRAG_LIFT : 0)) : null;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(l.field.x, l.field.y, l.field.w, l.field.h);
    for (const t of targets) {
      const [x, y] = toScreen(l, t.x, t.y);
      const on = near === t;
      ctx.fillStyle = on ? COLORS.accent : 'rgba(22,33,26,0.85)';
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = on ? 3 : 2;
      ctx.beginPath();
      ctx.arc(x, y, on ? 17 : 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const icon = t.order === 'push' ? '↑' : t.order === 'gank' ? '⤳' : t.order === 'defend' ? '⛨' : t.order === 'farm' ? '✦' : '⌂';
      label(ctx, icon, x, y + 1, on ? '#1a1a1a' : COLORS.accent, 14);
      const best = hero && HEROES[hero.hero as HeroKind].best === t.order;
      pill(ctx, best ? `★ ${t.label}` : t.label, x, t.labelAbove ? y - 25 : y + 25, on);
    }
    ctx.restore();
    if (pt && ui.dragHero && ui.dragHero.moved) {
      ctx.save();
      ctx.fillStyle = COLORS.you;
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y - DRAG_LIFT, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      label(ctx, HEROES[kind].code, pt.x, pt.y - DRAG_LIFT + 1, '#fff', 13);
      ctx.restore();
    }
  }

  // ---------- top bar and HUD ----------

  private drawTop(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim): void {
    const t = l.top;
    ctx.fillStyle = '#1d2b22';
    ctx.fillRect(t.x, t.y, t.w, t.h);
    const left = Math.ceil(sim.timeLeft() / TICKS_PER_SECOND);
    const mm = Math.floor(left / 60);
    const ss = String(left % 60).padStart(2, '0');
    const sudden = sim.phase() === 'sudden';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px system-ui';
    ctx.fillStyle = sudden ? '#ff8a80' : '#fff';
    ctx.fillText(sudden ? `Sudden death ${mm}:${ss}` : `⏱ ${mm}:${ss}`, t.x + 12, t.y + t.h / 2);
    if (sim.doubleMana() && !sim.result) {
      const w = ctx.measureText(sudden ? `Sudden death ${mm}:${ss}` : `⏱ ${mm}:${ss}`).width;
      pill(ctx, `×2 ${MANA.name}`, t.x + 12 + w + 44, t.y + t.h / 2, true);
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui';
    const cx = t.x + t.w / 2 + 34;
    ctx.fillStyle = COLORS.youLight;
    ctx.fillText(String(sim.players[0].towersDestroyed), cx - 26, t.y + t.h / 2);
    ctx.fillStyle = '#fff';
    ctx.fillText('–', cx - 12, t.y + t.h / 2);
    ctx.fillStyle = COLORS.foeLight;
    ctx.fillText(String(sim.players[1].towersDestroyed), cx + 2, t.y + t.h / 2);
    ctx.font = '12px system-ui';
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'left';
    ctx.fillText('towers', cx + 12, t.y + t.h / 2);
    // settings gear
    label(ctx, '⚙', l.gear.x + l.gear.w / 2, l.gear.y + l.gear.h / 2 + 1, '#ddd', 22);
  }

  private drawHud(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, ui: UiState): void {
    const hudY = l.heroSlots[0].y - 8;
    ctx.fillStyle = COLORS.hud;
    ctx.fillRect(l.col.x, hudY, l.col.w, l.h - hudY);
    const pl = sim.players[0];

    // Hero slots
    const infos: string[] = [];
    pl.picks.forEach((kind, i) => {
      const r = l.heroSlots[i];
      if (!r) return;
      const def = HEROES[kind];
      const h = sim.heroOf(0, kind);
      const cx = r.x + r.w / 2;
      const cy = r.y + 21;
      const sel = ui.selectedHero === kind || ui.dragHero?.hero === kind;
      ctx.save();
      if (!h) {
        ctx.strokeStyle = '#3a4a3f';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 19, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, def.code, cx, cy + 1, '#4c5d51', 14);
        label(ctx, 'in deck', cx, r.y + r.h - 3, '#6b7a6f', 9);
      } else {
        ctx.globalAlpha = h.alive ? 1 : 0.45;
        ctx.fillStyle = COLORS.you;
        ctx.strokeStyle = sel ? '#fff' : ORDER_COLORS[def.best];
        ctx.lineWidth = sel ? 4 : 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 19, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        label(ctx, def.code, cx, cy + 1, '#fff', 14);
        ctx.globalAlpha = 1;
        if (h.alive) {
          // Power cooldown: a ring that fills up; full = ready.
          const ready = 1 - Math.min(1, h.powerCd / Math.max(1, def.powerTicks));
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 23, -Math.PI / 2, -Math.PI / 2 + ready * Math.PI * 2);
          ctx.stroke();
          hpBar(ctx, cx, r.y + r.h - 7, 40, h.hp / h.maxHp, COLORS.youLight);
          pill(ctx, h.ultReady ? 'ULT' : `Lv${h.level}`, cx, r.y - 1, true);
          infos.push(`${def.name}: ${orderLabel(h)}${h.hidden ? ' (hidden)' : ''}`);
        } else {
          label(ctx, `${Math.ceil(h.respawn / TICKS_PER_SECOND)}s`, cx, cy + 1, '#fff', 14);
          infos.push(`${def.name}: back in ${Math.ceil(h.respawn / TICKS_PER_SECOND)}s · ${orderLabel(h)}`);
        }
      }
      ctx.restore();
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#ddd';
    const hi = l.heroInfo;
    const lines = infos.length ? infos : ['Play a hero card, then drag its', 'portrait onto the map to give orders.'];
    lines.slice(0, 2).forEach((s, i) => ctx.fillText(fit(ctx, s, hi.w), hi.x, hi.y + 14 + i * 17));
    if (infos.length && infos.length < 2) {
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(fit(ctx, 'Drag a portrait onto the map to order.', hi.w), hi.x, hi.y + 31);
    }

    // Next card
    ctx.fillStyle = COLORS.muted;
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', l.next.x + l.next.w / 2, l.next.y - 8);
    if (pl.next) this.drawCard(ctx, l.next, pl.next, sim.canAfford(0, pl.next), false, true);

    // Hand
    pl.hand.forEach((card, i) => {
      const r = l.cards[i];
      const lifted = ui.selectedCard === i || ui.dragCard?.index === i;
      const rr = lifted ? { ...r, y: r.y - 6 } : r;
      ctx.save();
      if (ui.dragCard?.index === i && ui.dragCard.moved) ctx.globalAlpha = 0.35;
      this.drawCard(ctx, rr, card, sim.canAfford(0, card), lifted, false);
      ctx.restore();
    });

    // Mana bar
    const m = l.mana;
    const value = pl.mana / MANA.perMana;
    ctx.fillStyle = '#2a2a2a';
    roundRect(ctx, m.x, m.y, m.w, m.h, m.h / 2);
    ctx.fill();
    ctx.fillStyle = COLORS.mana;
    roundRect(ctx, m.x, m.y, Math.max(m.h, (m.w * value) / 10), m.h, m.h / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const x = m.x + (m.w * i) / 10;
      ctx.beginPath();
      ctx.moveTo(x, m.y + 2);
      ctx.lineTo(x, m.y + m.h - 2);
      ctx.stroke();
    }
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e3c6ff';
    ctx.fillText(String(Math.floor(value)), m.x - 8, m.y + m.h / 2 + 1);
  }

  private drawCard(ctx: CanvasRenderingContext2D, r: Rect, card: CardId, affordable: boolean, lifted: boolean, small: boolean): void {
    const def = CARDS[card];
    ctx.save();
    ctx.globalAlpha *= affordable ? 1 : 0.55;
    ctx.fillStyle = def.kind === 'spell' ? COLORS.spell : def.kind === 'hero' ? COLORS.hero : COLORS.card;
    ctx.strokeStyle = def.kind === 'hero' ? '#c9962b' : lifted ? COLORS.accent : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = lifted || def.kind === 'hero' ? 2.5 : 1;
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (small) {
      ctx.font = '9px system-ui';
      ctx.fillText(fit(ctx, def.name, r.w - 4), r.x + r.w / 2, r.y + r.h / 2);
    } else {
      ctx.font = 'bold 12px system-ui';
      ctx.fillText(fit(ctx, def.name, r.w - 6), r.x + r.w / 2, r.y + r.h * 0.5);
      ctx.font = '9.5px system-ui';
      ctx.fillStyle = '#555';
      wrap(ctx, def.text, r.x + r.w / 2, r.y + r.h * 0.5 + 15, r.w - 8, 11);
      if (def.kind === 'hero') {
        ctx.font = 'bold 8.5px system-ui';
        ctx.fillStyle = '#8a5a00';
        ctx.fillText('HERO', r.x + r.w / 2, r.y + 13);
      }
    }
    // cost
    const cr = small ? 8 : 11;
    ctx.fillStyle = COLORS.mana;
    ctx.beginPath();
    ctx.arc(r.x + cr + 3, r.y + cr + 3, cr, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, String(def.cost), r.x + cr + 3, r.y + cr + 3.5, '#fff', small ? 10 : 13);
    ctx.restore();
  }

  private drawToast(ctx: CanvasRenderingContext2D, l: Layout, text: string): void {
    ctx.save();
    ctx.font = 'bold 14px system-ui';
    const w = ctx.measureText(text).width + 28;
    const x = l.col.x + l.col.w / 2 - w / 2;
    const y = l.heroSlots[0].y - 46;
    ctx.fillStyle = 'rgba(20,20,20,0.85)';
    roundRect(ctx, x, y, w, 30, 15);
    ctx.fill();
    label(ctx, text, l.col.x + l.col.w / 2, y + 15, '#fff', 14);
    ctx.restore();
  }
}

// ---------- small drawing helpers ----------

export function nearestTarget(l: Layout, targets: OrderTarget[], sx: number, sy: number, maxPx = 48): OrderTarget | null {
  let best: OrderTarget | null = null;
  let bestD = maxPx * maxPx;
  for (const t of targets) {
    const [x, y] = toScreen(l, t.x, t.y);
    const d = (x - sx) * (x - sx) + (y - sy) * (y - sy);
    if (d < bestD) { bestD = d; best = t; }
  }
  return best;
}

function inRectLoose(r: Rect, x: number, y: number): boolean {
  return x >= r.x - 20 && x <= r.x + r.w + 20 && y >= r.y - 20 && y <= r.y + r.h + 10;
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
  ctx.fillStyle = on ? COLORS.accent : 'rgba(22,33,26,0.9)';
  roundRect(ctx, x - w / 2, y - 7, w, 14, 7);
  ctx.fill();
  ctx.fillStyle = on ? '#1a1a1a' : COLORS.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

function hpBar(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, frac: number, color: string): void {
  const f = Math.max(0, Math.min(1, frac));
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(cx - w / 2, y - 2, w, 4);
  ctx.fillStyle = color;
  ctx.fillRect(cx - w / 2, y - 2, w * f, 4);
  ctx.restore();
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, lineH: number): void {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  let lines = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = w;
      yy += lineH;
      if (++lines >= 2) return;
    } else line = test;
  }
  if (line) ctx.fillText(line, cx, yy);
}
