// Drawing only, in the "Hikayat" style (DEC-010). Reads the match state and the UI state; never
// changes the rules. The painted map is cached (see art.ts); everything else is drawn each frame.
import { CORES, FIELD, LANES, LANE_HALF, pointAt } from '../game/map';
import { CARDS, CLASS_CARDS, DEPLOY, HEROES, MANA, MATCH, SPECIES, SPELLS, TICKS_PER_SECOND, UNITS, WARDS, type CardId, type HeroKind, type SpellCardId } from '../game/rules';
import type { Ent, GameEvent, Sim } from '../game/sim';
import { MapPainter, PAL, SPECIES_COLORS, SPELL_GLYPH, UNIT_GLYPH, glyph, kubu, pusaka, songket, teamColors, token, type Glyph } from './art';
import { type Layout, type Rect, toScreen } from './layout';
import { type OrderTarget, orderLabel, orderTargets, placeCard } from './placement';

/** Ring colour of a hero = its best order. */
export const ORDER_COLORS: Record<'push' | 'defend' | 'gank' | 'farm', string> = {
  push: '#f0932b', defend: '#4f8fe0', gank: '#e5534b', farm: '#5fb86b',
};

const INK = PAL.ink;

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
  private lastSeen = new Map<number, { x: number; y: number; at: number }>();
  private showRanges = false;
  private painter = new MapPainter();

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
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(0, 0, l.w, l.h);
    this.showRanges = ui.dragCard !== null || ui.selectedCard >= 0;
    this.drawField(ctx, l, sim);
    ctx.save();
    ctx.beginPath();
    ctx.rect(l.field.x, l.field.y, l.field.w, l.field.h);
    ctx.clip();
    this.drawPreview(ctx, l, sim, ui);
    this.drawEnts(ctx, l, sim, alpha, now);
    this.drawFx(ctx, l, now);
    ctx.restore();
    this.drawOrderTargets(ctx, l, sim, ui);
    this.drawTop(ctx, l, sim);
    this.drawHud(ctx, l, sim, ui);
    if (ui.toast && ui.toast.until > now) this.drawToast(ctx, l, ui.toast.text);
    ctx.restore();
  }

  // ---------- field ----------

  private drawField(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim): void {
    const f = l.field;
    // carved wooden frame around the board
    ctx.fillStyle = PAL.wood;
    roundRect(ctx, f.x - 4, f.y - 4, f.w + 8, f.h + 8, 8);
    ctx.fill();
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.drawImage(this.painter.get(l, sim), f.x, f.y, f.w, f.h);
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

  private drawPreview(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, ui: UiState): void {
    const index = ui.dragCard ? ui.dragCard.index : ui.selectedCard;
    if (index < 0) return;
    const card = sim.players[0].hand[index];
    if (!card) return;
    const def = CARDS[card];
    if (def.kind !== 'spell') {
      // Allowed drop zones: a light wash over your side of each lane.
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = LANE_HALF * 2 * l.scale;
      ctx.strokeStyle = 'rgba(156,192,255,0.32)';
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
    ctx.globalAlpha = 0.8;
    if (p.kind === 'spell') {
      const r = SPELLS[card as SpellCardId].radius * l.scale;
      ctx.strokeStyle = PAL.gold;
      ctx.fillStyle = 'rgba(224,176,74,0.22)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      glyph(ctx, SPELL_GLYPH[card] ?? 'bolt', sx, sy, 9, PAL.gold);
    } else if (def.hero) {
      heroToken(ctx, sx, sy, 15, 0, def.hero, false);
    } else if (def.unit) {
      const st = UNITS[def.unit];
      token(ctx, sx, sy, Math.max(9, st.radius * l.scale * 1.3), 0, UNIT_GLYPH[def.unit], { flying: st.flying, square: st.targets === 'buildings' });
      if ((def.count ?? 1) > 1) pill(ctx, `×${def.count}`, sx, sy + 18, true);
    }
    ctx.restore();
  }

  // ---------- entities ----------

  private drawEnts(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, alpha: number, now: number): void {
    this.drawZones(ctx, l, sim);
    for (const e of sim.ents) if (e.kind === 'camp') this.drawCamp(ctx, l, e, now);
    for (const e of sim.ents) if (e.kind === 'relic' && e.alive) this.drawRelic(ctx, l, e, now);
    for (const e of sim.ents) if (e.kind === 'ward' && e.alive) this.drawWard(ctx, l, e, now);
    for (const e of sim.ents) if (e.kind === 'tower' || e.kind === 'core') this.drawStructure(ctx, l, sim, e, this.showRanges);
    for (const e of sim.ents) if (e.kind === 'hero' && e.owner === 0 && e.alive) this.drawOrderLine(ctx, l, sim, e, alpha);
    for (const e of sim.ents) if (e.kind === 'unit' && e.alive && !e.flying) this.drawUnit(ctx, l, e, alpha);
    for (const e of sim.ents) if (e.kind === 'hero' && !e.flying) this.drawHero(ctx, l, e, alpha, now);
    // fliers on top
    for (const e of sim.ents) if (e.kind === 'unit' && e.alive && e.flying) this.drawUnit(ctx, l, e, alpha);
    for (const e of sim.ents) if (e.kind === 'hero' && e.flying) this.drawHero(ctx, l, e, alpha, now);
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
      if (!o || !o.alive) continue;
      const [x1, y1] = toScreen(l, ...this.pos(e, alpha));
      const [x2, y2] = toScreen(l, ...this.pos(o, alpha));
      ctx.save();
      ctx.strokeStyle = PAL.gold;
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1) / 2 + 16, 0, Math.PI * 2);
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
    ctx.fillStyle = 'rgba(10,20,10,0.35)';
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

  private drawStructure(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, e: Ent, showRange: boolean): void {
    const [x, y] = toScreen(l, e.x, e.y);
    const isCore = e.kind === 'core';
    const s = isCore ? Math.max(36, e.r * 1.6 * l.scale) : Math.max(22, e.r * 1.9 * l.scale);
    const c = teamColors(e.owner);
    if (e.alive && showRange) {
      ctx.save();
      ctx.strokeStyle = e.owner === 0 ? 'rgba(156,192,255,0.4)' : 'rgba(244,162,140,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, (e.range + e.r) * l.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
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
    if (e.hp < e.maxHp) hpBar(ctx, x, y - s * 0.62 - 5, Math.max(s, 30), e.hp / e.maxHp, c.light);
  }

  private pos(e: Ent, alpha: number): [number, number] {
    return [e.px + (e.x - e.px) * alpha, e.py + (e.y - e.py) * alpha];
  }

  private drawUnit(ctx: CanvasRenderingContext2D, l: Layout, e: Ent, alpha: number): void {
    const [wx, wy] = this.pos(e, alpha);
    const [x, y] = toScreen(l, wx, wy);
    const kind = e.unit ?? 'spearman';
    const st = UNITS[kind];
    const r = Math.max(e.wave ? 4.5 : 6, e.r * l.scale * 1.15);
    const owner = e.charm > 0 ? e.owner : e.owner;
    if (kind === 'watchtower') {
      kubu(ctx, x, y, r * 2, owner, true);
    } else {
      ctx.save();
      if (e.deploy > 0) ctx.globalAlpha = 0.5;
      token(ctx, x, y, r, owner, UNIT_GLYPH[kind], { flying: e.flying, square: st.targets === 'buildings', wave: e.wave, faded: kind === 'decoy' });
      ctx.restore();
    }
    this.marks(ctx, e, x, y, r);
    if (e.hp < e.maxHp && !e.wave) hpBar(ctx, x, y - r - 5, Math.max(12, r * 2.2), e.hp / e.maxHp, teamColors(owner).light);
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
          ctx.globalAlpha = 0.65 * (1 - (now - seen.at) / 4000);
          ctx.fillStyle = 'rgba(20,10,5,0.55)';
          ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
          label(ctx, '?', x, y + 1, PAL.parchment, 14);
          ctx.restore();
        }
        return;
      }
      this.lastSeen.set(e.id, { x: e.x, y: e.y, at: now });
    }
    const [x, y] = toScreen(l, wx, wy);
    const r = Math.max(12, e.r * l.scale * 1.35);
    ctx.save();
    if (e.deploy > 0) ctx.globalAlpha = 0.5;
    if (mine && e.hidden) ctx.globalAlpha = 0.6;
    heroToken(ctx, x, y, r, e.owner, e.hero as HeroKind, e.ultReady, e.flying, mine && e.hidden);
    // level pip
    ctx.fillStyle = PAL.gold;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + r * 0.82, y + r * 0.82, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    label(ctx, String(e.level), x + r * 0.82, y + r * 0.82 + 0.5, INK, 9);
    if (e.fury > 0) label(ctx, '✹', x - r * 0.85, y - r * 0.8, '#ff7a3d', 11);
    ctx.restore();
    this.marks(ctx, e, x, y, r);
    hpBar(ctx, x, y - r - 7, r * 2.4, e.hp / e.maxHp, mine ? PAL.youLight : PAL.foeLight);
  }

  /** Small marks for effects on a unit or hero. */
  private marks(ctx: CanvasRenderingContext2D, e: Ent, x: number, y: number, r: number): void {
    ctx.save();
    if (e.slow > 0) {
      ctx.strokeStyle = '#a8e6ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, Math.PI * 2); ctx.stroke();
    }
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
      ctx.strokeText(icons, x, y - r - 13);
      ctx.fillStyle = e.dot > 0 && icons === '•' ? '#8be36b' : '#ffe066';
      ctx.fillText(icons, x, y - r - 13);
    }
    ctx.restore();
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
    }
    const [hx, hy] = this.pos(h, alpha);
    const [x1, y1] = toScreen(l, hx, hy);
    const [x2, y2] = toScreen(l, tx, ty);
    ctx.save();
    ctx.strokeStyle = 'rgba(224,176,74,0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
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
            ctx.strokeStyle = ev.owner === 0 ? '#dbe8ff' : ev.owner === 1 ? '#ffd8cc' : '#ffe2a0';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          } else {
            // ink slash
            ctx.strokeStyle = '#fff6d8';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x2 - 4, y2 - 4); ctx.lineTo(x2 + 4, y2 + 4); ctx.stroke();
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
          if (age > 450) break;
          const [x, y] = toScreen(l, ev.x, ev.y);
          ctx.globalAlpha = 1 - age / 450;
          ctx.fillStyle = ev.owner === 0 ? PAL.youLight : ev.owner === 1 ? PAL.foeLight : PAL.gold;
          for (let i = 0; i < (ev.big ? 8 : 4); i++) {
            const a = (i / (ev.big ? 8 : 4)) * Math.PI * 2;
            const d = 3 + age / (ev.big ? 18 : 30);
            ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, ev.big ? 2.5 : 1.5, 0, Math.PI * 2); ctx.fill();
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
          ctx.strokeStyle = 'rgba(29,20,14,0.85)';
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
    ctx.fillStyle = 'rgba(20,12,6,0.3)';
    ctx.fillRect(l.field.x, l.field.y, l.field.w, l.field.h);
    for (const t of targets) {
      const [x, y] = toScreen(l, t.x, t.y);
      const on = near === t;
      const best = hero && HEROES[hero.hero as HeroKind].best === t.order;
      ctx.fillStyle = on ? PAL.gold : 'rgba(43,29,20,0.88)';
      ctx.strokeStyle = best ? PAL.gold : PAL.parchmentDark;
      ctx.lineWidth = on ? 3 : best ? 2.5 : 1.5;
      ctx.beginPath(); ctx.arc(x, y, on ? 16 : 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      label(ctx, t.icon, x, y + 1, on ? INK : PAL.gold, on ? 14 : 12);
      if (on) pill(ctx, best ? `★ ${t.label}` : t.label, x, y + 27, true);
    }
    // a key for the icons
    pill(ctx, '↑ push  ⤳ gank  ⛨ defend  ✦ farm  ◉ ward  ◆ relic  ⌂ retreat', l.field.x + l.field.w / 2, l.field.y + 12, false);
    ctx.restore();
    if (pt && ui.dragHero && ui.dragHero.moved) heroToken(ctx, pt.x, pt.y - DRAG_LIFT, 15, 0, kind, false);
  }

  // ---------- top bar and HUD ----------

  private drawTop(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim): void {
    const t = l.top;
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(t.x, t.y, t.w, t.h);
    songket(ctx, t.x, t.y + t.h - 6, t.w, 6);
    const left = Math.ceil(sim.timeLeft() / TICKS_PER_SECOND);
    const mm = Math.floor(left / 60);
    const ss = String(left % 60).padStart(2, '0');
    const sudden = sim.phase() === 'sudden';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.fillStyle = sudden ? PAL.foeLight : PAL.parchment;
    const timeText = sudden ? `Sudden death ${mm}:${ss}` : `${mm}:${ss}`;
    ctx.fillText(timeText, t.x + 12, t.y + t.h / 2 - 2);
    if (sim.doubleMana() && !sim.result) {
      const w = ctx.measureText(timeText).width;
      pill(ctx, `×2 ${MANA.name}`, t.x + 12 + w + 44, t.y + t.h / 2 - 2, true);
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Georgia, serif';
    const cx = t.x + t.w / 2 + 40;
    ctx.fillStyle = PAL.youLight;
    ctx.fillText(String(sim.players[0].towersDestroyed), cx - 26, t.y + t.h / 2 - 2);
    ctx.fillStyle = PAL.parchment;
    ctx.fillText('–', cx - 12, t.y + t.h / 2 - 2);
    ctx.fillStyle = PAL.foeLight;
    ctx.fillText(String(sim.players[1].towersDestroyed), cx + 2, t.y + t.h / 2 - 2);
    ctx.font = '11px Georgia, serif';
    ctx.fillStyle = PAL.parchmentDark;
    ctx.textAlign = 'left';
    ctx.fillText('kubu', cx + 12, t.y + t.h / 2 - 2);
    label(ctx, '⚙', l.gear.x + l.gear.w / 2, l.gear.y + l.gear.h / 2 - 1, PAL.parchment, 21);
  }

  private drawHud(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, _ui: UiState): void {
    const ui = _ui;
    const hudY = l.waves[0].y - 8;
    // dark timber panel with a songket edge
    const g = ctx.createLinearGradient(0, hudY, 0, l.h);
    g.addColorStop(0, PAL.woodDark);
    g.addColorStop(1, '#22150d');
    ctx.fillStyle = g;
    ctx.fillRect(l.col.x, hudY, l.col.w, l.h - hudY);
    songket(ctx, l.col.x, hudY, l.col.w, 6);
    const pl = sim.players[0];

    // Lane wave chips (DEC-008): tap to change the class marching in that lane.
    const sp = SPECIES[pl.species];
    l.waves.forEach((r, lane) => {
      const active = sim.lanes.includes(lane as 0 | 1 | 2);
      const card = CLASS_CARDS[pl.laneClass[lane]];
      ctx.save();
      ctx.globalAlpha = active ? 1 : 0.35;
      ctx.fillStyle = PAL.parchment;
      ctx.strokeStyle = SPECIES_COLORS[pl.species];
      ctx.lineWidth = 2;
      roundRect(ctx, r.x, r.y, r.w, r.h, 7);
      ctx.fill(); ctx.stroke();
      token(ctx, r.x + 13, r.y + r.h / 2, 8, 0, UNIT_GLYPH[card.unit ?? 'spearman'], { flying: UNITS[card.unit ?? 'spearman'].flying });
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 9px system-ui';
      ctx.fillText(`${['LEFT', 'MID', 'RIGHT'][lane]} WAVE ×${card.wave}`, r.x + 25, r.y + 7.5);
      ctx.font = 'bold 11px Georgia, serif';
      ctx.fillText(fit(ctx, active ? card.name : 'no lane', r.w - 30), r.x + 25, r.y + r.h - 7);
      ctx.restore();
    });
    void sp;

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
        ctx.strokeStyle = PAL.woodLight;
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 19, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, def.code, cx, cy + 1, PAL.woodLight, 14);
        label(ctx, 'in deck', cx, r.y + r.h - 3, PAL.woodLight, 9);
      } else {
        ctx.globalAlpha = h.alive ? 1 : 0.45;
        heroToken(ctx, cx, cy, 19, 0, kind, h.alive && h.ultReady, false, false, sel);
        ctx.globalAlpha = 1;
        if (h.alive) {
          const ready = 1 - Math.min(1, h.powerCd / Math.max(1, def.powerTicks));
          ctx.strokeStyle = PAL.parchment;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + ready * Math.PI * 2); ctx.stroke();
          hpBar(ctx, cx, r.y + r.h - 6, 40, h.hp / h.maxHp, PAL.youLight);
          pill(ctx, h.ultReady ? 'ULT' : `Lv${h.level}`, cx, r.y - 2, true);
          infos.push(`${def.name}: ${orderLabel(h, sim)}${h.hidden ? ' (hidden)' : ''}${h.fury > 0 ? ' ✹' : ''}`);
        } else {
          label(ctx, `${Math.ceil(h.respawn / TICKS_PER_SECOND)}s`, cx, cy + 1, PAL.parchment, 14);
          infos.push(`${def.name}: back in ${Math.ceil(h.respawn / TICKS_PER_SECOND)}s`);
        }
      }
      ctx.restore();
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '12px Georgia, serif';
    ctx.fillStyle = PAL.parchment;
    const hi = l.heroInfo;
    const lines = infos.length ? infos : ['Play a hero card, then drag its', 'portrait onto the map to give orders.'];
    lines.slice(0, 2).forEach((s, i) => ctx.fillText(fit(ctx, s, hi.w), hi.x, hi.y + 13 + i * 17));
    if (infos.length && infos.length < 2) {
      ctx.fillStyle = PAL.parchmentDark;
      ctx.fillText(fit(ctx, 'Drag a portrait onto the map to order.', hi.w), hi.x, hi.y + 30);
    }

    // Next card
    ctx.fillStyle = PAL.parchmentDark;
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', l.next.x + l.next.w / 2, l.next.y - 8);
    if (pl.next) this.drawCard(ctx, l.next, pl.next, sim, false, true);

    // Hand
    pl.hand.forEach((card, i) => {
      const r = l.cards[i];
      const lifted = ui.selectedCard === i || ui.dragCard?.index === i;
      const rr = lifted ? { ...r, y: r.y - 6 } : r;
      ctx.save();
      if (ui.dragCard?.index === i && ui.dragCard.moved) ctx.globalAlpha = 0.35;
      this.drawCard(ctx, rr, card, sim, lifted, false);
      ctx.restore();
    });

    // Semangat bar: ten purple beads on a cord
    const m = l.mana;
    const value = pl.mana / MANA.perMana;
    ctx.strokeStyle = PAL.woodLight;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(m.x, m.y + m.h / 2); ctx.lineTo(m.x + m.w, m.y + m.h / 2); ctx.stroke();
    const step = m.w / 10;
    for (let i = 0; i < 10; i++) {
      const cx = m.x + step * (i + 0.5);
      const fill = Math.max(0, Math.min(1, value - i));
      ctx.fillStyle = '#3a2a3f';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, m.y + m.h / 2, m.h / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (fill > 0) {
        ctx.fillStyle = fill >= 1 ? '#b06ce0' : 'rgba(176,108,224,0.45)';
        ctx.beginPath(); ctx.arc(cx, m.y + m.h / 2, (m.h / 2 - 1.5) * (fill >= 1 ? 1 : 0.7), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e7c6ff';
    ctx.fillText(String(Math.floor(value)), m.x - 8, m.y + m.h / 2 + 1);
  }

  private drawCard(ctx: CanvasRenderingContext2D, r: Rect, card: CardId, sim: Sim, lifted: boolean, small: boolean): void {
    const def = CARDS[card];
    const affordable = sim.canAfford(0, card);
    const cost = sim.costOf(0, card);
    ctx.save();
    ctx.globalAlpha *= affordable ? 1 : 0.55;
    // parchment card with a coloured banner by kind
    ctx.fillStyle = PAL.parchment;
    ctx.strokeStyle = lifted ? PAL.gold : INK;
    ctx.lineWidth = lifted ? 3 : 1.5;
    roundRect(ctx, r.x, r.y, r.w, r.h, 7);
    ctx.fill();
    ctx.stroke();
    const banner = def.kind === 'hero' ? PAL.gold : def.kind === 'spell' ? '#7d4fa8' : SPECIES_COLORS[sim.players[0].species];
    ctx.fillStyle = banner;
    ctx.save();
    roundRect(ctx, r.x, r.y, r.w, r.h, 7);
    ctx.clip();
    ctx.fillRect(r.x, r.y, r.w, small ? 6 : 9);
    ctx.restore();
    // art: glyph in a medallion
    const g: Glyph = def.unit ? UNIT_GLYPH[def.unit] : def.kind === 'spell' ? SPELL_GLYPH[card] ?? 'bolt' : 'crown';
    const mx = r.x + r.w / 2;
    const my = r.y + (small ? r.h * 0.42 : r.h * 0.4);
    const mr = small ? 11 : 15;
    if (def.hero) heroToken(ctx, mx, my, mr, 0, def.hero, false);
    else {
      ctx.fillStyle = def.kind === 'spell' ? '#e8dcf2' : '#efe0bb';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      glyph(ctx, g, mx, my, mr * 0.62, def.kind === 'spell' ? '#5b2f84' : PAL.woodDark);
    }
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (small) {
      ctx.font = 'bold 8.5px Georgia, serif';
      ctx.fillText(fit(ctx, def.name, r.w - 4), mx, r.y + r.h - 9);
    } else {
      ctx.font = 'bold 11.5px Georgia, serif';
      ctx.fillText(fit(ctx, def.name, r.w - 6), mx, r.y + r.h * 0.72);
      ctx.font = '9px system-ui';
      ctx.fillStyle = '#5a4630';
      const sub = def.kind === 'hero' ? HEROES[def.hero as HeroKind].role : def.kind === 'spell' ? 'Spell' : `×${def.count ?? 1}`;
      ctx.fillText(fit(ctx, sub, r.w - 6), mx, r.y + r.h * 0.88);
    }
    // cost gem
    const cr = small ? 8 : 10.5;
    ctx.fillStyle = '#8e4fc4';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r.x + cr + 3, r.y + 3); ctx.lineTo(r.x + 2 * cr + 3, r.y + cr + 3); ctx.lineTo(r.x + cr + 3, r.y + 2 * cr + 3); ctx.lineTo(r.x + 3, r.y + cr + 3); ctx.closePath();
    ctx.fill(); ctx.stroke();
    label(ctx, String(cost), r.x + cr + 3, r.y + cr + 3.5, '#fff', small ? 9 : 12);
    ctx.restore();
  }

  private drawToast(ctx: CanvasRenderingContext2D, l: Layout, text: string): void {
    ctx.save();
    ctx.font = 'bold 14px Georgia, serif';
    const w = ctx.measureText(text).width + 28;
    const x = l.col.x + l.col.w / 2 - w / 2;
    const y = l.waves[0].y - 50;
    ctx.fillStyle = 'rgba(43,29,20,0.92)';
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, 30, 15);
    ctx.fill(); ctx.stroke();
    label(ctx, text, l.col.x + l.col.w / 2, y + 15, PAL.parchment, 14);
    ctx.restore();
  }
}

/** A hero token: team disc, songket-gold rim, best-order ring and the hero's two letters. */
export function heroToken(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, owner: number, kind: HeroKind, ultReady: boolean, flying = false, hidden = false, selected = false): void {
  const c = teamColors(owner);
  const def = HEROES[kind];
  ctx.save();
  ctx.fillStyle = 'rgba(10,20,10,0.38)';
  ctx.beginPath(); ctx.ellipse(x + (flying ? 5 : 2), y + r * 0.6 + (flying ? 8 : 2), r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  const yy = flying ? y - 3 : y;
  if (ultReady) {
    ctx.strokeStyle = 'rgba(224,176,74,0.6)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x, yy, r + 5, 0, Math.PI * 2); ctx.stroke();
  }
  // gold rim with a zigzag (songket) pattern
  ctx.fillStyle = PAL.gold;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, yy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = PAL.goldDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = i % 2 ? r * 0.92 : r * 0.8;
    const px = x + Math.cos(a) * rr;
    const py = yy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // team disc
  ctx.fillStyle = c.base;
  ctx.strokeStyle = selected ? '#ffffff' : ORDER_COLORS[def.best];
  ctx.lineWidth = selected ? 3 : 2;
  if (hidden) ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.arc(x, yy, r * 0.72, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#fff8e6';
  ctx.font = `bold ${Math.round(r * 0.72)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.code, x, yy + 1);
  ctx.restore();
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
  ctx.fillStyle = on ? PAL.gold : 'rgba(43,29,20,0.9)';
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
  ctx.fillStyle = 'rgba(29,20,14,0.75)';
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
