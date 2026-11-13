// Combat visuals (PLAN-013): how and where pieces attack (projectiles by style, melee slashes,
// impacts, damage numbers), heroes talking back to the player (speech bubbles), readable status
// badges, the ultimate's cast moment and badge, and off-screen hero arrows. All in the batik paper
// style (DEC-018): paper pieces with a white cut edge and a crisp shadow. Drawing only; no game rules.
import type { HeroKind, UnitKind } from '../game/rules';
import { PAL } from './art';

const TAU = Math.PI * 2;
const EDGE = PAL.paperEdge;
const SHADOW = 'rgba(16,14,34,0.4)';

// ---------------------------------------------------------------------------------------------
// how each piece attacks

export type Shot = 'arrow' | 'stone' | 'dart' | 'water' | 'spit' | 'bolt' | 'coin' | 'feather';

export interface AttackStyle {
  /** What flies to the target (ranged), or null for a melee slash. */
  shot: Shot | null;
  /** The colour of the bolt or the slash. */
  color: string;
  /** Big hitters land with a thud ring. */
  heavy: boolean;
}

const HERO_STYLE: Partial<Record<HeroKind, Partial<AttackStyle>>> = {
  rimba: { shot: 'arrow' },
  helang: { shot: 'arrow', color: '#f4f0e8' },
  seri: { shot: 'bolt', color: '#fff2c0' },
  senja: { shot: 'bolt', color: '#c79bf0' },
  dalang: { shot: 'bolt', color: '#9b59d0' },
  embun: { shot: 'bolt', color: '#cfefff' },
  hujan: { shot: 'water', color: '#9fdcef' },
  saudagar: { shot: 'coin', color: PAL.gold },
  tukang: { shot: 'dart', color: '#a8c46a' },
  tedung: { shot: 'spit', color: '#9fd04a' },
  gergasi: { heavy: true, color: '#e8a060' },
  badak: { heavy: true },
  buaya: { heavy: true, color: '#a8d070' },
  benteng: { heavy: true },
  belang: { color: '#ffb35a' },
  pendekar: { color: '#ffe9a8' },
};

const UNIT_STYLE: Partial<Record<UnitKind, Partial<AttackStyle>>> = {
  archer: { shot: 'arrow' },
  sumpit: { shot: 'water', color: '#9fdcef' },
  enggang: { shot: 'feather', color: '#1d1d1d' },
  lontar: { shot: 'stone', color: '#b9b4aa' },
  ratu: { shot: 'spit', color: '#d6b84a' },
  watchtower: { shot: 'arrow' },
  golem: { heavy: true },
  seladang: { heavy: true },
  ram: { heavy: true },
  ketam: { heavy: true },
  kumbang: { heavy: true },
  gajahmina: { heavy: true, color: '#9fdcef' },
};

/** How a piece attacks. `team` is its side's light colour (the default slash colour). */
export function attackStyle(kind: string, hero: HeroKind | null, unit: UnitKind | null, range: number, team: string): AttackStyle {
  if (kind === 'tower' || kind === 'core') return { shot: 'dart', color: PAL.gold, heavy: false };
  const s = (hero ? HERO_STYLE[hero] : unit ? UNIT_STYLE[unit] : undefined) ?? {};
  return { shot: s.shot ?? (range > 300 ? 'bolt' : null), color: s.color ?? team, heavy: s.heavy ?? false };
}

/** How long a shot is in the air, from the distance in world units (fast: it is a hint, not a delay). */
export function flightMs(worldDist: number): number {
  return Math.max(80, Math.min(220, worldDist / 4.5));
}

// ---------------------------------------------------------------------------------------------
// small paper helpers

/** A crisp paper shadow (no blur, cheap every frame). Shadow offsets ignore the transform, so scale by it. */
function shadowOn(ctx: CanvasRenderingContext2D): void {
  const m = ctx.getTransform();
  const k = Math.hypot(m.a, m.b) || 1;
  ctx.shadowColor = SHADOW;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 1 * k;
  ctx.shadowOffsetY = 1.6 * k;
}

/** Fill the current path as a cut paper piece: a shadowed white cut edge, then the colour. */
function paperFill(ctx: CanvasRenderingContext2D, color: string, edge: number): void {
  ctx.save();
  shadowOn(ctx);
  ctx.strokeStyle = EDGE; ctx.lineWidth = edge * 2; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = color; ctx.fill();
}

// ---------------------------------------------------------------------------------------------
// shots in flight

/** A shot at (x, y) flying along angle a. `s` scales it with the zoom. `team` tints arrow fletching. */
export function drawShot(ctx: CanvasRenderingContext2D, shot: Shot, x: number, y: number, a: number, s: number, color: string, team: string, now: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (shot) {
    case 'arrow':
    case 'feather': {
      ctx.rotate(a);
      const L = 11 * s;
      // shaft with a white edge, a steel head, team fletching
      ctx.strokeStyle = EDGE; ctx.lineWidth = 3.2 * s;
      ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L * 0.55, 0); ctx.stroke();
      ctx.strokeStyle = shot === 'feather' ? '#2a2a2a' : '#7b4a22'; ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L * 0.55, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(L * 0.45, -2.8 * s); ctx.lineTo(L * 0.45, 2.8 * s); ctx.closePath();
      paperFill(ctx, shot === 'feather' ? '#f0c040' : '#dfe4e8', 0.8);
      ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-L - 3 * s, -3 * s); ctx.lineTo(-L + 3 * s, 0); ctx.lineTo(-L - 3 * s, 3 * s); ctx.closePath();
      paperFill(ctx, shot === 'feather' ? '#1d1d1d' : team, 0.6);
      break;
    }
    case 'stone': {
      ctx.beginPath(); ctx.arc(0, 0, 3.6 * s, 0, TAU);
      paperFill(ctx, color, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.arc(-1.2 * s, -1.2 * s, 1.2 * s, 0, TAU); ctx.fill();
      break;
    }
    case 'dart': {
      ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(7 * s, 0); ctx.lineTo(-4 * s, -3.2 * s); ctx.lineTo(-2 * s, 0); ctx.lineTo(-4 * s, 3.2 * s); ctx.closePath();
      paperFill(ctx, color, 0.9);
      break;
    }
    case 'water':
    case 'spit': {
      ctx.rotate(a);
      for (let i = 2; i >= 1; i--) {
        ctx.beginPath(); ctx.arc(-i * 5 * s, 0, (2.4 - i * 0.6) * s, 0, TAU);
        ctx.fillStyle = color; ctx.globalAlpha = 0.6; ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.ellipse(0, 0, 5 * s, 3 * s, 0, 0, TAU);
      paperFill(ctx, color, 0.9);
      break;
    }
    case 'coin': {
      ctx.scale(Math.abs(Math.cos(now / 60)) * 0.7 + 0.3, 1);
      ctx.beginPath(); ctx.arc(0, 0, 3.8 * s, 0, TAU);
      paperFill(ctx, color, 0.9);
      ctx.strokeStyle = PAL.goldDark; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(0, 0, 1.8 * s, 0, TAU); ctx.stroke();
      break;
    }
    case 'bolt': {
      // a paper star with a trail of tissue dots
      ctx.rotate(a);
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.45 - i * 0.1;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(-i * 5 * s, 0, (3.4 - i * 0.7) * s, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.rotate(now / 90);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = (i % 2 ? 2 : 4.8) * s;
        const t = (i / 8) * TAU;
        if (i === 0) ctx.moveTo(Math.cos(t) * r, Math.sin(t) * r); else ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r);
      }
      ctx.closePath();
      paperFill(ctx, color, 0.9);
      break;
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// hits landing

/** A melee slash: a paper crescent swept across the target, facing away from the attacker (angle a). */
export function drawSlash(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, t: number, s: number, color: string): void {
  const r = 10 * s;
  const sweep = Math.min(1, t / 0.55);
  const a0 = a - 1.25;
  const a1 = a0 + 2.5 * sweep;
  ctx.save();
  ctx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r, a0, a1);
  ctx.save();
  shadowOn(ctx);
  ctx.strokeStyle = EDGE; ctx.lineWidth = 4.5 * s; ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = color; ctx.lineWidth = 2.2 * s; ctx.stroke();
  ctx.restore();
}

/** A heavy hit: a paper ring that thumps out at the target's feet. */
export function drawThud(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, s: number): void {
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath(); ctx.ellipse(x, y, (8 + 14 * t) * s, (3 + 5 * t) * s, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(122,82,48,0.7)';
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();
  ctx.restore();
}

/** Paper confetti bursting from a hit (seeded by n so it looks random but steady). */
export function drawImpact(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, s: number, color: string, n: number): void {
  ctx.save();
  ctx.globalAlpha = 1 - t;
  for (let i = 0; i < 5; i++) {
    const a = ((n * 7 + i * 13) % 10) / 10 * TAU;
    const d = (3 + 11 * t) * s;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d - 4 * t * s;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a + t * 4);
    ctx.fillStyle = i % 2 ? EDGE : color;
    ctx.fillRect(-1.6 * s, -1 * s, 3.2 * s, 2 * s);
    ctx.restore();
  }
  ctx.restore();
}

/** A damage number rising from a hit (t: 0..1 of its life). */
export function drawNumber(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, t: number, color: string, size: number): void {
  ctx.save();
  ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
  const pop = t < 0.12 ? 0.7 + 2.5 * t : 1;
  ctx.font = `bold ${Math.round(size * pop)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(17,26,47,0.9)';
  const ty = y - 20 * t;
  ctx.strokeText(text, x, ty);
  ctx.fillStyle = color;
  ctx.fillText(text, x, ty);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// where heroes are attacking

/** A hero's line to what it is hitting, with a reticle on the target. */
export function drawTargetLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, r: number, now: number): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.75;
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -now / 40;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x2, y2, r, 0, TAU); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + now / 600;
    ctx.beginPath();
    ctx.moveTo(x2 + Math.cos(a) * (r - 3), y2 + Math.sin(a) * (r - 3));
    ctx.lineTo(x2 + Math.cos(a) * (r + 4), y2 + Math.sin(a) * (r + 4));
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// heroes talking back

/** Where bubbles drawn this frame sit, so a new one can step up instead of covering them. */
export type BubbleRects = { x: number; y: number; w: number; h: number }[];

/** A paper speech bubble whose tail points down at (x, y), kept inside [minX, maxX]. If `taken` is
 *  given, the bubble steps up past any bubble already drawn there this frame. */
export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, alpha: number, accent: string, minX: number, maxX: number, taken?: BubbleRects): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 10.5px system-ui';
  const w = Math.min(150, ctx.measureText(text).width + 14);
  const h = 19;
  const bx = Math.max(minX + 2, Math.min(maxX - w - 2, x - w / 2));
  let by = y - h - 7;
  if (taken) {
    for (let guard = 0; guard < 4; guard++) {
      const hit = taken.find((r) => bx < r.x + r.w && bx + w > r.x && by < r.y + r.h && by + h > r.y);
      if (!hit) break;
      by = hit.y - h - 3;
    }
    taken.push({ x: bx, y: by, w, h });
  }
  y = Math.max(y, by + h); // the tail still reaches down from the bubble
  const path = () => {
    ctx.beginPath();
    const r = 7;
    ctx.moveTo(bx + r, by); ctx.lineTo(bx + w - r, by); ctx.quadraticCurveTo(bx + w, by, bx + w, by + r);
    ctx.lineTo(bx + w, by + h - r); ctx.quadraticCurveTo(bx + w, by + h, bx + w - r, by + h);
    const tx = Math.max(bx + 8, Math.min(bx + w - 8, x));
    ctx.lineTo(tx + 5, by + h); ctx.lineTo(tx, y); ctx.lineTo(tx - 5, by + h);
    ctx.lineTo(bx + r, by + h); ctx.quadraticCurveTo(bx, by + h, bx, by + h - r);
    ctx.lineTo(bx, by + r); ctx.quadraticCurveTo(bx, by, bx + r, by); ctx.closePath();
  };
  path();
  paperFill(ctx, PAL.parchment, 1.6);
  ctx.strokeStyle = accent; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = PAL.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let t = text;
  while (t.length > 2 && ctx.measureText(t).width > w - 12) t = t.slice(0, -2) + '…';
  ctx.fillText(t, bx + 7, by + h / 2 + 0.5);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// status you can read

/** Stun stars, a silenced bubble, poison drops and a frost ring, round a piece whose head is at (x, y). */
export function drawStatus(ctx: CanvasRenderingContext2D, st: { stun: number; silence: number; dot: number; slow: number }, x: number, y: number, r: number, now: number): void {
  ctx.save();
  if (st.slow > 0) {
    ctx.strokeStyle = 'rgba(168,230,255,0.9)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.ellipse(x, y + r * 1.6, r * 1.3, r * 0.5, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (st.stun > 0) {
    for (let i = 0; i < 3; i++) {
      const a = now / 260 + (i / 3) * TAU;
      const px = x + Math.cos(a) * r * 1.1;
      const py = y - r * 0.9 + Math.sin(a) * r * 0.35;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? 1.4 : 3.4;
        const t = (k / 10) * TAU - Math.PI / 2;
        if (k === 0) ctx.moveTo(px + Math.cos(t) * rr, py + Math.sin(t) * rr); else ctx.lineTo(px + Math.cos(t) * rr, py + Math.sin(t) * rr);
      }
      ctx.closePath();
      paperFill(ctx, '#ffe066', 0.7);
    }
  }
  if (st.silence > 0) {
    const bx = x + r * 1.1;
    const by = y - r * 1.2;
    ctx.beginPath(); ctx.ellipse(bx, by, 5, 4, 0, 0, TAU);
    ctx.moveTo(bx - 2, by + 3); ctx.lineTo(bx - 4, by + 6.5); ctx.lineTo(bx + 0.5, by + 3.5);
    paperFill(ctx, PAL.parchment, 0.8);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bx - 3.5, by + 2.5); ctx.lineTo(bx + 3.5, by - 2.5); ctx.stroke();
  }
  if (st.dot > 0) {
    for (let i = 0; i < 2; i++) {
      const ph = ((now / 700 + i * 0.5) % 1);
      const px = x - r * 0.9 + i * r * 1.8;
      const py = y - r * 0.2 + ph * r * 1.4;
      ctx.globalAlpha = 1 - ph;
      ctx.beginPath();
      ctx.moveTo(px, py - 3); ctx.quadraticCurveTo(px + 2.4, py + 1, px, py + 2); ctx.quadraticCurveTo(px - 2.4, py + 1, px, py - 3);
      ctx.fillStyle = '#8be36b'; ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// ultimates on the hero

/** The cast moment (t: 0..1): paper rays burst out behind the hero and turn. */
export function drawCastRays(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, s: number, color: string): void {
  ctx.save();
  ctx.globalAlpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
  const R = (22 + 26 * Math.min(1, t * 2)) * s;
  ctx.translate(x, y);
  ctx.rotate(t * 1.2);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.09) * R * 0.35, Math.sin(a - 0.09) * R * 0.35);
    ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    ctx.lineTo(Math.cos(a + 0.09) * R * 0.35, Math.sin(a + 0.09) * R * 0.35);
    ctx.closePath();
    paperFill(ctx, i % 2 ? PAL.gold : color, 0.8);
  }
  ctx.restore();
}

/** While an ultimate is called and waiting for its moment: a turning gold ring with orbiting sparks. */
export function drawCharge(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, now: number): void {
  ctx.save();
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.lineDashOffset = -now / 30;
  ctx.beginPath(); ctx.ellipse(x, y, 20 * s, 7.5 * s, 0, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 3; i++) {
    const a = now / 300 + (i / 3) * TAU;
    const px = x + Math.cos(a) * 20 * s;
    const py = y - 10 * s + Math.sin(a) * 7.5 * s - (Math.sin(now / 200 + i) + 1) * 6 * s;
    ctx.beginPath(); ctx.moveTo(px, py - 3.5); ctx.lineTo(px + 2.2, py); ctx.lineTo(px, py + 3.5); ctx.lineTo(px - 2.2, py); ctx.closePath();
    paperFill(ctx, '#ffe9a8', 0.6);
  }
  ctx.restore();
}

/** "ULT" ready: a small gold paper badge bobbing above your hero. */
export function drawUltBadge(ctx: CanvasRenderingContext2D, x: number, y: number, now: number): void {
  const by = y - 3 * Math.abs(Math.sin(now / 280));
  ctx.save();
  ctx.beginPath();
  const w = 26;
  const h = 12;
  ctx.moveTo(x - w / 2 + 4, by - h); ctx.lineTo(x + w / 2 - 4, by - h); ctx.quadraticCurveTo(x + w / 2, by - h, x + w / 2, by - h + 4);
  ctx.lineTo(x + w / 2, by - 4); ctx.quadraticCurveTo(x + w / 2, by, x + w / 2 - 4, by);
  ctx.lineTo(x + 3, by); ctx.lineTo(x, by + 4); ctx.lineTo(x - 3, by);
  ctx.lineTo(x - w / 2 + 4, by); ctx.quadraticCurveTo(x - w / 2, by, x - w / 2, by - 4);
  ctx.lineTo(x - w / 2, by - h + 4); ctx.quadraticCurveTo(x - w / 2, by - h, x - w / 2 + 4, by - h); ctx.closePath();
  paperFill(ctx, PAL.gold, 1.2);
  ctx.fillStyle = PAL.ink;
  ctx.font = 'bold 8.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ULT', x, by - h / 2 + 0.5);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// heroes off the screen

/** A paper tab at the map's edge pointing (angle a) to an off-screen hero; `ring` colours its rim. */
export function drawEdgeTab(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, ring: string, portrait: () => void): void {
  ctx.save();
  // the pointer
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(a) * 21, y + Math.sin(a) * 21);
  ctx.lineTo(x + Math.cos(a + 0.5) * 13, y + Math.sin(a + 0.5) * 13);
  ctx.lineTo(x + Math.cos(a - 0.5) * 13, y + Math.sin(a - 0.5) * 13);
  ctx.closePath();
  paperFill(ctx, ring, 1);
  ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU);
  paperFill(ctx, ring, 1.5);
  ctx.restore();
  portrait();
}
