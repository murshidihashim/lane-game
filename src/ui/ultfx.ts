// Ultimate visuals (DEC-013): a banner that says who used which ultimate, a bold one-off burst on
// the map for each hero's ultimate, and a looping aura while a lasting ultimate is on.
// Batik paper style (DEC-018, PLAN-010): every effect is cut paper. Strokes are paper strips and
// shapes are paper pieces, each with a white cut edge and a crisp paper shadow. Glows are layered
// tissue paper with a perforated edge, and sparks are paper confetti. No blurred shadows or
// gradients, so it stays cheap every frame. Drawing only; no game rules.
import { HEROES, type HeroKind } from '../game/rules';
import { PAL, teamColors } from './art';
import { drawPortrait } from './figures';
import { type Layout, toScreen } from './layout';

const INK = PAL.ink;
const TAU = Math.PI * 2;

export interface UltFx {
  hero: HeroKind;
  owner: number;
  x: number;
  y: number;
  r: number;
  x2?: number;
  y2?: number;
  /** ms, performance.now() */
  start: number;
}

export const ULT_BURST_MS = 1600;
export const ULT_BANNER_MS = 1900;

// ---------------------------------------------------------------------------------------------
// helpers

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);
/** Fade in quickly, hold, fade out over the last 30%. */
const fade = (t: number) => (t < 0.12 ? t / 0.12 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1);

/** A stable pseudo-random number in [0, 1) from integers (looks random, same every frame). */
function rnd(a: number, b = 0): number {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const EDGE = PAL.paperEdge;
const SHADOW = 'rgba(16,14,34,0.38)';

/** A crisp paper shadow (no blur, so it is cheap every frame); offsets in CSS px. */
function shadowOn(ctx: CanvasRenderingContext2D): void {
  const k = ctx.getTransform().a;
  ctx.shadowColor = SHADOW;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 1.2 * k;
  ctx.shadowOffsetY = 2 * k;
}

/** Stroke the current path as a paper strip: shadow and white cut edge, then the colour. */
function paperStroke(ctx: CanvasRenderingContext2D, color: string, w: number): void {
  ctx.save();
  shadowOn(ctx);
  ctx.strokeStyle = EDGE; ctx.lineWidth = w + 3; ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}

/** Fill the current path as a cut paper piece: shadow and white cut edge, then the colour. */
function paperFill(ctx: CanvasRenderingContext2D, color: string, edge = 1.5, rule: CanvasFillRule = 'nonzero'): void {
  ctx.save();
  shadowOn(ctx);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = EDGE; ctx.lineWidth = edge * 2; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = color; ctx.fill(rule);
}

/** Batik dots printed inside the current path. */
function printDots(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, step: number, color: string): void {
  ctx.save();
  ctx.clip();
  ctx.fillStyle = color;
  let row = 0;
  for (let y = y0; y <= y1; y += step, row++) {
    for (let x = x0 + (row % 2) * step * 0.5; x <= x1; x += step) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, step * 0.12), 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

/** A paper ring; wide ones get a stitched line along the middle. `paper` false: a plain thin line. */
function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, w: number, paper = true): void {
  if (r <= 0) return;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  if (!paper) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); return; }
  paperStroke(ctx, color, w);
  if (w >= 3.5) {
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(251,247,236,0.6)'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** Layered tissue paper (in place of a glow): two translucent discs with a perforated edge. */
function tissue(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hex: string, a: number): void {
  if (r <= 0) return;
  ctx.fillStyle = rgba(hex, a * 0.3);
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x - r * 0.06, y - r * 0.06, r * 0.6, 0, TAU); ctx.fill();
  ctx.setLineDash([2.5, 3]);
  ctx.strokeStyle = rgba(EDGE, Math.min(1, a * 0.9)); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, r * 0.97, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
}

/** A crescent: the circle (ax, ay, r1) with the circle (bx, by, r2) cut out of it, as one outline. */
function crescent(ctx: CanvasRenderingContext2D, ax: number, ay: number, r1: number, bx: number, by: number, r2: number): void {
  const d = Math.hypot(bx - ax, by - ay);
  const beta = Math.atan2(by - ay, bx - ax);
  const alpha = Math.acos(Math.max(-1, Math.min(1, (r1 * r1 - r2 * r2 + d * d) / (2 * d * r1))));
  const p1x = ax + Math.cos(beta + alpha) * r1;
  const p1y = ay + Math.sin(beta + alpha) * r1;
  const p2x = ax + Math.cos(beta - alpha) * r1;
  const p2y = ay + Math.sin(beta - alpha) * r1;
  ctx.beginPath();
  ctx.arc(ax, ay, r1, beta + alpha, beta - alpha + TAU); // the outer edge, away from the cut
  ctx.arc(bx, by, r2, Math.atan2(p2y - by, p2x - bx), Math.atan2(p1y - by, p1x - bx), true); // the inner edge
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points: number, fill: string, rot = 0): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i / (points * 2)) * TAU - Math.PI / 2;
    const rr = i % 2 ? r * 0.42 : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  paperFill(ctx, fill, 1.1);
}

function feather(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, rot: number, color: string): void {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0); ctx.quadraticCurveTo(0, -len * 0.32, len / 2, 0); ctx.quadraticCurveTo(0, len * 0.32, -len / 2, 0);
  paperFill(ctx, color, 1.1);
  ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.lineTo(len / 2, 0); ctx.strokeStyle = rgba(INK, 0.45); ctx.lineWidth = 0.8; ctx.stroke();
  ctx.restore();
}

function drop(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.3, x, y + s * 0.6); ctx.quadraticCurveTo(x - s * 0.8, y + s * 0.3, x, y - s);
  paperFill(ctx, color, 0.9);
}

/** A tear in the paper: a jagged strip with a white cut edge. */
function crack(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, a: number, seed: number, color: string, w: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 1; i <= 4; i++) {
    const t = (len * i) / 4;
    const j = (rnd(seed, i) - 0.5) * len * 0.35;
    ctx.lineTo(x + Math.cos(a) * t - Math.sin(a) * j, y + Math.sin(a) * t + Math.cos(a) * j);
  }
  paperStroke(ctx, color, w);
}

/** A paper keris pointing along +x, hilt at the origin side, `len` long. */
function keris(ctx: CanvasRenderingContext2D, len: number): void {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 7; i++) {
    const x = -len * 0.18 + (len * 0.68 * i) / 7;
    pts.push([x, i === 7 ? 0 : (i % 2 ? -1 : 1) * len * 0.035]);
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [px, py] of pts) ctx.lineTo(px, py);
  paperStroke(ctx, '#dfe4e8', len * 0.075);
  ctx.beginPath(); ctx.moveTo(len * 0.5, 0); ctx.lineTo(len * 0.42, -len * 0.04); ctx.lineTo(len * 0.42, len * 0.04); ctx.closePath();
  paperFill(ctx, '#dfe4e8', 1);
  ctx.beginPath(); ctx.ellipse(-len * 0.2, 0, len * 0.05, len * 0.12, 0, 0, TAU);
  paperFill(ctx, PAL.gold, 1.2);
  ctx.beginPath(); ctx.moveTo(-len * 0.22, 0); ctx.quadraticCurveTo(-len * 0.4, -len * 0.02, -len * 0.48, len * 0.08);
  paperStroke(ctx, '#7a5230', len * 0.07);
}

function silenceGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.75, 0, 0, TAU);
  ctx.moveTo(x - s * 0.35, y + s * 0.6); ctx.lineTo(x - s * 0.6, y + s * 1.1); ctx.lineTo(x + s * 0.05, y + s * 0.7);
  paperFill(ctx, PAL.parchment, 1.2);
  ctx.beginPath(); ctx.moveTo(x - s * 0.55, y + s * 0.45); ctx.lineTo(x + s * 0.55, y - s * 0.45);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.stroke();
}

// ---------------------------------------------------------------------------------------------
// the bursts

/** The one-off effect on the map when an ultimate fires (lasts ULT_BURST_MS). */
export function drawUltBurst(ctx: CanvasRenderingContext2D, l: Layout, fx: UltFx, now: number): void {
  const t = (now - fx.start) / ULT_BURST_MS;
  if (t < 0 || t > 1) return;
  const [x, y] = toScreen(l, fx.x, fx.y);
  const R = Math.max(14, fx.r * l.scale);
  const [x2, y2] = fx.x2 !== undefined && fx.y2 !== undefined ? toScreen(l, fx.x2, fx.y2) : [x, y];
  const e = easeOut(clamp01(t / 0.6));
  const a = fade(t);
  const fwd = fx.owner === 1 ? 1 : -1; // forward = towards the enemy side of the screen
  const team = teamColors(fx.owner);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (fx.hero) {
    case 'rimba': {
      tissue(ctx, x, y, R * 1.8, '#e5534b', 0.35);
      const rr = R * (1.6 - 0.6 * e);
      ring(ctx, x, y, rr, '#e5534b', 3);
      ring(ctx, x, y, rr * 0.45, '#e5534b', 2);
      for (let i = 0; i < 4; i++) {
        const ang = i * (Math.PI / 2) + t * 1.5;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * rr * 0.75, y + Math.sin(ang) * rr * 0.75);
        ctx.lineTo(x + Math.cos(ang) * rr * 1.25, y + Math.sin(ang) * rr * 1.25);
        paperStroke(ctx, '#e5534b', 2.8);
      }
      const k = clamp01((t - 0.15) / 0.3);
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * R * 0.32;
        ctx.beginPath();
        ctx.moveTo(x + ox - R * 0.4, y - R * 0.5);
        ctx.lineTo(x + ox - R * 0.4 + R * 0.8 * k, y - R * 0.5 + R * 1.0 * k);
        paperStroke(ctx, '#7d2219', 2.4);
      }
      break;
    }
    case 'benteng': {
      const rise = e;
      const r = R * 0.9;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * rise, 0, Math.PI, TAU);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,229,160,0.5)'; ctx.fill();
      printDots(ctx, x - r, y - r, x + r, y, 7, 'rgba(165,122,36,0.45)');
      ctx.beginPath(); ctx.ellipse(x, y, r, r * rise, 0, Math.PI, TAU); ctx.closePath();
      paperStroke(ctx, PAL.gold, 2.5);
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.ellipse(x, y, r * (i / 4), r * rise, 0, Math.PI, TAU);
        ctx.strokeStyle = rgba(PAL.gold, 0.6); ctx.lineWidth = 1.2; ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.3, 0, 0, TAU);
      ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 5; i++) star(ctx, x + (rnd(i, 7) - 0.5) * r * 1.6, y - r * rise * rnd(i, 9), 4 + 3 * rnd(i, 3), 4, '#fff6d0', t * 3);
      break;
    }
    case 'kail': {
      for (let i = 0; i < 3; i++) {
        const k = clamp01((t - i * 0.12) / 0.75);
        if (k <= 0) continue;
        ctx.globalAlpha = a * (1 - k * 0.7);
        ring(ctx, x, y, R * easeOut(k), i === 0 ? '#e8f6f8' : PAL.riverLight, 5 - i);
      }
      ctx.globalAlpha = a;
      for (let i = 0; i < 18; i++) {
        const ang = (i / 18) * TAU + rnd(i) * 0.3;
        const d = R * (0.3 + 0.75 * e) * (0.8 + rnd(i, 2) * 0.3);
        drop(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, 4, '#bfe8f4');
      }
      break;
    }
    case 'seri': {
      tissue(ctx, x, y, R * 1.1, '#fff2c0', 0.55);
      ctx.beginPath();
      ctx.arc(x, y, R * e, -Math.PI * 0.9 + t * 2, -Math.PI * 0.1 + t * 2);
      paperStroke(ctx, '#fff2c0', 7);
      for (let i = 0; i < 26; i++) {
        const ang = rnd(i, 1) * TAU + t * (1 + rnd(i, 4));
        const d = R * (0.15 + 0.85 * rnd(i, 2)) * e;
        const yy = y + Math.sin(ang) * d - t * 30 * rnd(i, 5);
        const px = x + Math.cos(ang) * d;
        const q = 2 + 2 * rnd(i, 6);
        ctx.beginPath(); ctx.moveTo(px, yy - q); ctx.lineTo(px + q * 0.7, yy); ctx.lineTo(px, yy + q); ctx.lineTo(px - q * 0.7, yy); ctx.closePath();
        paperFill(ctx, i % 3 ? '#ffe9a8' : PAL.gold, 0.7);
      }
      break;
    }
    case 'belang': {
      tissue(ctx, x, y - 10, R * (0.7 + 0.6 * e), '#e08a2e', 0.65);
      // roar: sound-wave arcs on both sides
      for (let i = 0; i < 3; i++) {
        const rr = R * (0.45 + 0.3 * i) * (0.6 + 0.4 * e);
        for (const side of [0, Math.PI]) {
          ctx.beginPath(); ctx.arc(x, y - 10, rr, side - 0.6, side + 0.6);
          paperStroke(ctx, i === 1 ? '#fbf3df' : '#e08a2e', 3.5 - i);
        }
      }
      // three tiger stripes slashing across
      const k = clamp01((t - 0.1) / 0.3);
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * R * 0.22;
        ctx.beginPath();
        ctx.moveTo(x + ox - R * 0.28, y - R * 0.55);
        ctx.quadraticCurveTo(x + ox + R * 0.1, y - R * 0.2, x + ox - R * 0.28 + R * 0.5 * k, y - R * 0.55 + R * 0.75 * k);
        paperStroke(ctx, PAL.ink, 4);
      }
      break;
    }
    case 'gergasi': {
      for (let i = 0; i < 9; i++) crack(ctx, x, y, R * (0.5 + 0.6 * e) * (0.7 + rnd(i) * 0.5), (i / 9) * TAU + rnd(i, 3), i, '#e5534b', 2.4);
      if (fx.x2 !== undefined) {
        const ang = Math.atan2(y2 - y, x2 - x);
        const len = Math.hypot(x2 - x, y2 - y) * e;
        crack(ctx, x, y, len, ang, 99, '#ff9a5a', 3.5);
      }
      tissue(ctx, x, y, R * 1.3, '#c0392b', 0.5);
      ring(ctx, x, y, R * e, '#ff6a3a', 4);
      break;
    }
    case 'dalang': {
      const k = clamp01(t / 0.4);
      const bx = (x + x2) / 2;
      const by = Math.min(y, y2) - Math.max(40, Math.abs(x2 - x) * 0.3);
      ctx.beginPath(); ctx.moveTo(bx - 18, by); ctx.lineTo(bx + 18, by);
      paperStroke(ctx, '#93643b', 4);
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.quadraticCurveTo(x + (bx - x) * 0.5, by - 30, bx + i * 16, by);
        ctx.lineTo(bx + i * 16 + (x2 + i * 8 - bx - i * 16) * k, by + (y2 - 6 - by) * k);
        ctx.strokeStyle = 'rgba(185,120,235,0.95)'; ctx.lineWidth = 2; ctx.stroke();
      }
      tissue(ctx, x2, y2, R * 1.6, '#9b59d0', 0.6);
      ring(ctx, x2, y2, R * (1.2 - 0.3 * e), '#b98ae8', 3);
      break;
    }
    case 'senja': {
      const f = l.field;
      ctx.fillStyle = 'rgba(60,24,96,0.34)';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = 'rgba(232,135,58,0.16)';
      ctx.fillRect(f.x, f.y + f.h * 0.55, f.w, f.h * 0.45);
      const mx = f.x + f.w * (0.15 + 0.7 * e);
      const my = f.y + f.h * 0.28;
      const mr = Math.min(f.w, f.h) * 0.16;
      tissue(ctx, mx, my, mr * 2, '#f6d27a', 0.35);
      crescent(ctx, mx, my, mr, mx + mr * 0.45, my - mr * 0.15, mr * 0.85);
      paperFill(ctx, '#f6d27a', 2);
      ring(ctx, x, y, Math.min(R, Math.max(f.w, f.h)) * e * 0.5, '#9b59d0', 3);
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * TAU + t;
        silenceGlyph(ctx, x + Math.cos(ang) * 60 * e, y + Math.sin(ang) * 60 * e - 10, 9);
      }
      break;
    }
    case 'hujan': {
      const r = R;
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      ctx.fillStyle = 'rgba(42,132,150,0.22)'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      for (let i = 0; i < 40; i++) {
        const rx = x - r + rnd(i, 1) * r * 2;
        const ry = y - r + ((rnd(i, 2) * r * 2 + t * r * 3) % (r * 2));
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 4, ry + 12);
        ctx.strokeStyle = 'rgba(190,232,244,0.95)'; ctx.lineWidth = 1.6; ctx.stroke();
      }
      ctx.restore();
      for (let i = 0; i < 6; i++) {
        const k = (t * 2 + rnd(i, 3)) % 1;
        ring(ctx, x + (rnd(i, 4) - 0.5) * r * 1.3, y + (rnd(i, 5) - 0.5) * r * 1.3, 4 + k * 14, rgba('#e8f6f8', 1 - k), 1.6, false);
      }
      ring(ctx, x, y, r * e, PAL.riverLight, 3.5);
      break;
    }
    case 'layang': {
      const k = clamp01(t / 0.45);
      const cx = (x + x2) / 2;
      const cy = Math.min(y, y2) - 70;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      const steps = 24;
      for (let i = 1; i <= Math.round(steps * k); i++) {
        const s = i / steps;
        const px = (1 - s) * (1 - s) * x2 + 2 * (1 - s) * s * cx + s * s * x;
        const py = (1 - s) * (1 - s) * y2 + 2 * (1 - s) * s * cy + s * s * y;
        ctx.lineTo(px, py);
      }
      paperStroke(ctx, '#fff6d0', 4.5);
      ctx.strokeStyle = team.base; ctx.lineWidth = 1.5; ctx.stroke();
      if (t > 0.4) {
        const q = clamp01((t - 0.4) / 0.4);
        ring(ctx, x, y, R * easeOut(q), '#f3e6c4', 4);
        for (let i = 0; i < 5; i++) star(ctx, x + Math.cos(i * 1.26 + t * 4) * R * 0.5, y - 12 + Math.sin(i * 1.26 + t * 4) * R * 0.2, 5, 5, PAL.gold);
      }
      break;
    }
    case 'pendekar': {
      const mx = (x + x2) / 2;
      const my = (y + y2) / 2;
      ring(ctx, mx, my, R * (1.3 - 0.3 * e), PAL.gold, 4);
      tissue(ctx, mx, my - 22, 44, '#fff6d0', 0.7);
      const s = 46;
      for (const sgn of [-1, 1]) {
        ctx.save();
        ctx.translate(mx, my - 22);
        ctx.rotate(-Math.PI / 2 + sgn * (Math.PI / 4 + (1 - e) * 0.9));
        keris(ctx, s);
        ctx.restore();
      }
      break;
    }
    case 'pelanduk': {
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * TAU;
        const d = 8 + 26 * e;
        ctx.beginPath(); ctx.arc(x2 + Math.cos(ang) * d, y2 + Math.sin(ang) * d * 0.7 - 8, 9 + 6 * e, 0, TAU);
        paperFill(ctx, rgba('#ded6c4', 0.9 * (1 - t)), 1.2);
      }
      if (t > 0.25) {
        const q = clamp01((t - 0.25) / 0.5);
        tissue(ctx, x, y - 10, 40, '#ffe9a8', 0.7 * (1 - q * 0.5));
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * TAU + q * 2;
          star(ctx, x + Math.cos(ang) * 26 * easeOut(q), y - 12 + Math.sin(ang) * 26 * easeOut(q), 5, 4, PAL.gold, q * 3);
        }
      }
      break;
    }
    case 'saudagar': {
      tissue(ctx, x, y - 20, R * 0.9, '#e0b04a', 0.5);
      for (let i = 0; i < 18; i++) {
        const vx = (rnd(i, 1) - 0.5) * 2.2;
        const vy = 1.2 + rnd(i, 2) * 1.1;
        const tt = clamp01(t * 1.2 - rnd(i, 3) * 0.2);
        const px = x + vx * R * 0.6 * tt;
        const py = y - 10 - (vy * tt - 1.4 * tt * tt) * R * 0.75;
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(Math.abs(Math.cos(tt * 9 + i)) * 0.8 + 0.2, 1);
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU);
        paperFill(ctx, PAL.gold, 1);
        ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, TAU); ctx.strokeStyle = PAL.goldDark; ctx.stroke();
        ctx.restore();
      }
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 ? '#e8873a' : '#c0532b';
        const ang = rnd(i, 7) * TAU;
        ctx.beginPath(); ctx.arc(x + Math.cos(ang) * R * 0.7 * e, y - 10 + Math.sin(ang) * R * 0.5 * e, 2, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'badak': {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const s = i / n;
        if (s > e) break;
        const px = x2 + (x - x2) * s;
        const py = y2 + (y - y2) * s;
        ctx.beginPath(); ctx.arc(px + (rnd(i) - 0.5) * 10, py + (rnd(i, 2) - 0.5) * 10, 7 + 8 * s, 0, TAU);
        paperFill(ctx, rgba('#c9a46a', 0.85 * (1 - t * 0.6)), 1.2);
      }
      if (t > 0.3) {
        const q = easeOut(clamp01((t - 0.3) / 0.5));
        ring(ctx, x, y, R * q, '#d8b77d', 5);
        ring(ctx, x, y, R * q * 0.6, '#b8955a', 3);
        for (let i = 0; i < 7; i++) crack(ctx, x, y, R * 0.6 * q, (i / 7) * TAU, i + 40, '#7a5230', 2);
      }
      break;
    }
    case 'tedung': {
      ring(ctx, x, y, R * (1.4 - 0.5 * e), '#8fbf3a', 4);
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const s = i / 40;
        const ang = s * TAU * 1.5 + t * 4;
        const rr = R * (0.4 + 0.6 * s) * e;
        const px = x + Math.cos(ang) * rr;
        const py = y + Math.sin(ang) * rr * 0.6;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      paperStroke(ctx, '#6b7a2e', 4);
      const k = clamp01((t - 0.1) / 0.25);
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + sgn * 10, y - 46 + 20 * k);
        ctx.quadraticCurveTo(x + sgn * 14, y - 20 + 20 * k, x + sgn * 4, y - 8 + 20 * k);
        ctx.quadraticCurveTo(x + sgn * 6, y - 26 + 20 * k, x + sgn * 4, y - 46 + 20 * k);
        ctx.closePath();
        paperFill(ctx, '#efe4cc', 1.2);
      }
      tissue(ctx, x, y, R, '#8fbf3a', 0.4);
      break;
    }
    case 'tukang': {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU;
        const px = x + Math.cos(ang) * R * 0.8;
        const py = y + Math.sin(ang) * R * 0.5;
        const h = 34 * clamp01((t - i * 0.03) / 0.35);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - h);
        paperStroke(ctx, '#7aa83a', 4);
        for (let s = 1; s < 3; s++) if (h > s * 11) { ctx.beginPath(); ctx.moveTo(px - 2, py - s * 11); ctx.lineTo(px + 2, py - s * 11); ctx.strokeStyle = '#4f7a23'; ctx.lineWidth = 1.4; ctx.stroke(); }
      }
      ctx.beginPath(); ctx.ellipse(x, y - 22 * e, R * 0.8, R * 0.5, 0, 0, TAU);
      ctx.strokeStyle = '#a8653d'; ctx.lineWidth = 2.5; ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const ang = rnd(i, 3) * TAU;
        const d = 10 + 30 * e * rnd(i, 4);
        star(ctx, x + Math.cos(ang) * d, y - 20 + Math.sin(ang) * d, 3.5, 4, '#ffd76a', t * 5);
      }
      break;
    }
    case 'helang': {
      tissue(ctx, x, y, R * 0.6, '#f4f0e8', 0.35);
      for (let i = 0; i < 22; i++) {
        const ang = (i / 22) * TAU + t * 3 + rnd(i) * 0.4;
        const d = R * (0.1 + 0.9 * e) * (0.5 + 0.5 * rnd(i, 2));
        feather(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.8, 13, ang + Math.PI / 2, i % 3 ? '#7a5230' : '#f4f0e8');
      }
      ring(ctx, x, y, R * 0.5 * e, '#f4f0e8', 2.5);
      break;
    }
    case 'embun': {
      if (t < 0.18) { ctx.globalAlpha = a * (1 - t / 0.18); tissue(ctx, x, y, R * 1.2, '#ffffff', 0.9); ctx.globalAlpha = a; }
      ctx.beginPath(); ctx.arc(x, y, R * e, 0, TAU);
      ctx.fillStyle = 'rgba(191,232,244,0.25)'; ctx.fill();
      ring(ctx, x, y, R * e, '#bfe8f4', 4.5);
      ring(ctx, x, y, R * e * 0.92, '#ffffff', 1.5, false);
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * TAU;
        const px = x + Math.cos(ang) * R * e * 0.85;
        const py = y + Math.sin(ang) * R * e * 0.85;
        ctx.save(); ctx.translate(px, py); ctx.rotate(t * 2 + i);
        for (let k = 0; k < 3; k++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
          paperStroke(ctx, '#e8f8ff', 1.8);
        }
        ctx.restore();
      }
      break;
    }
    case 'ombak': {
      const travel = R * 0.9 * e;
      const cy = y + fwd * travel;
      const w = R * 0.7;
      const depth = 34;
      // the body of the wave: a curved band, fading towards the back
      ctx.beginPath();
      ctx.moveTo(x - w, cy - fwd * 4);
      ctx.quadraticCurveTo(x, cy + fwd * 26, x + w, cy - fwd * 4);
      ctx.quadraticCurveTo(x, cy + fwd * (26 - depth) , x - w, cy - fwd * (4 + depth * 0.4));
      ctx.closePath();
      paperFill(ctx, rgba(PAL.river, 0.85), 1.5);
      printDots(ctx, x - w, cy - depth - 30, x + w, cy + 30, 6, 'rgba(232,246,240,0.45)');
      // foam crest along the front edge, curling forward
      ctx.beginPath();
      ctx.moveTo(x - w, cy - fwd * 4);
      ctx.quadraticCurveTo(x, cy + fwd * 26, x + w, cy - fwd * 4);
      paperStroke(ctx, '#e8f6f8', 5.5);
      for (let i = 1; i < 6; i++) {
        const s = i / 6;
        const px = x - w + 2 * w * s;
        const py = cy - fwd * 4 + fwd * 30 * s * (1 - s) * 2;
        ctx.beginPath(); ctx.arc(px, py + fwd * 3, 6, fwd > 0 ? 0 : Math.PI, fwd > 0 ? Math.PI * 1.4 : Math.PI * 2.4);
        paperStroke(ctx, '#e8f6f8', 2.6);
      }
      for (let i = 0; i < 10; i++) drop(ctx, x - w + rnd(i, 2) * 2 * w, cy + fwd * (18 + 14 * rnd(i, 3)), 3.5, '#e8f6f8');
      break;
    }
    case 'buaya': {
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * TAU + rnd(i) * 0.3;
        const d = R * (0.3 + 0.8 * e);
        drop(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.7 - 10 * Math.sin(t * Math.PI), 4.5, '#7a9a4a');
      }
      ring(ctx, x, y, R * e, '#5f8a3a', 4);
      ctx.globalAlpha = a * 0.8;
      for (let row = 0; row < 3; row++) for (let col = -2; col <= 2; col++) {
        ctx.beginPath(); ctx.arc(x + col * 10 + (row % 2) * 5, y - 30 + row * 8, 5, Math.PI, 0);
        ctx.strokeStyle = '#a8d070'; ctx.lineWidth = 1.6; ctx.stroke();
      }
      tissue(ctx, x, y - 16, 34, '#a8d070', 0.45);
      break;
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// auras for lasting ultimates

/** A looping aura round a hero while its lasting ultimate is on. (x, y) is the feet point. */
export function drawUltAura(ctx: CanvasRenderingContext2D, kind: HeroKind, x: number, y: number, height: number, now: number): void {
  const t = now / 1000;
  const cy = y - height * 0.5;
  ctx.save();
  ctx.lineCap = 'round';
  switch (kind) {
    case 'gergasi': {
      tissue(ctx, x, cy, height * 0.8, '#c0392b', 0.35);
      for (let i = 0; i < 5; i++) {
        const ph = (t * 2.2 + i / 5) % 1;
        const fx = x + Math.cos(i * 1.3) * height * 0.38;
        const fy = y - ph * height * 0.9;
        const s = height * 0.14 * (1 - ph);
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath();
        ctx.moveTo(fx, fy - s * 1.6);
        ctx.quadraticCurveTo(fx + s, fy, fx, fy + s * 0.6);
        ctx.quadraticCurveTo(fx - s, fy, fx, fy - s * 1.6);
        paperFill(ctx, i % 2 ? '#ff9a3a' : '#e5534b', 0.8);
      }
      break;
    }
    case 'helang': {
      for (let i = 0; i < 4; i++) {
        const ang = t * 4 + (i / 4) * TAU;
        feather(ctx, x + Math.cos(ang) * height * 0.5, cy + Math.sin(ang) * height * 0.22, height * 0.3, ang + Math.PI / 2, i % 2 ? '#f4f0e8' : '#7a5230');
      }
      break;
    }
    case 'buaya': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.beginPath(); ctx.ellipse(x, cy, height * 0.5, height * 0.62, 0, 0, TAU);
      ctx.fillStyle = `rgba(143,191,58,${0.12 + 0.12 * pulse})`; ctx.fill();
      ctx.strokeStyle = `rgba(95,138,58,${0.6 + 0.3 * pulse})`; ctx.lineWidth = 2.2; ctx.stroke();
      for (let row = 0; row < 3; row++) for (let col = -1; col <= 1; col++) {
        ctx.beginPath(); ctx.arc(x + col * height * 0.16 + (row % 2) * height * 0.08, cy - height * 0.2 + row * height * 0.18, height * 0.07, Math.PI, 0);
        ctx.strokeStyle = `rgba(168,208,112,${0.5 + 0.4 * pulse})`; ctx.lineWidth = 1.4; ctx.stroke();
      }
      break;
    }
    case 'ombak': {
      for (let i = 0; i < 6; i++) {
        const ph = (t * 1.6 + i / 6) % 1;
        const ang = (i / 6) * TAU + t;
        ctx.globalAlpha = 1 - ph;
        drop(ctx, x + Math.cos(ang) * height * (0.3 + 0.3 * ph), y - 4 - ph * height * 0.45, height * 0.07, '#bfe8f4');
      }
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.ellipse(x, y, height * 0.6, height * 0.16, 0, 0, TAU);
      ctx.strokeStyle = '#e8f6f8'; ctx.lineWidth = 2; ctx.stroke();
      break;
    }
    case 'seri': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      tissue(ctx, x, cy, height * (0.75 + 0.15 * pulse), '#fff2c0', 0.45);
      for (let i = 0; i < 4; i++) {
        const ang = t * 1.5 + (i / 4) * TAU;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(x + Math.cos(ang) * height * 0.45, cy + Math.sin(ang) * height * 0.3, 1.8, 0, TAU); ctx.fill();
      }
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// the banner

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

/** "ULTIMATE · Kail · Riptide" across the top of the field; slot 0/1 stacks two banners. */
export function drawUltBanner(ctx: CanvasRenderingContext2D, l: Layout, fx: UltFx, now: number, mine: boolean, slot: number, dpr: number): void {
  const t = now - fx.start;
  if (t < 0 || t > ULT_BANNER_MS) return;
  const f = l.field;
  const h = 42;
  const w = Math.min(f.w - 16, 360);
  const y = f.y + 8 + slot * (h + 6);
  const slide = 1 - easeOut(clamp01(t / 220));
  const dir = mine ? -1 : 1;
  const x = f.x + (f.w - w) / 2 + dir * slide * (w + 20);
  const alpha = t > ULT_BANNER_MS - 350 ? (ULT_BANNER_MS - t) / 350 : 1;
  const team = teamColors(mine ? 0 : 1);
  const def = HEROES[fx.hero];
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  // body
  ctx.beginPath();
  const r = 10;
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  // a team-coloured paper card: white cut edge, crisp paper shadow, printed batik dots, gold rule
  paperFill(ctx, team.base, 2.5);
  ctx.save(); ctx.clip(); ctx.fillStyle = team.dark; ctx.fillRect(x, y, 40, h); ctx.restore();
  printDots(ctx, x, y, x + w, y + h, 7, 'rgba(255,255,255,0.12)');
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  ctx.lineWidth = 1.2; ctx.strokeStyle = PAL.gold; ctx.stroke();
  // songket zigzag along the bottom
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 8, y + h - 7, w - 16, 5); ctx.clip();
  ctx.beginPath();
  for (let i = 0; i <= (w - 16) / 5; i++) {
    const px = x + 8 + i * 5;
    ctx.lineTo(px, y + h - (i % 2 ? 6.5 : 2.5));
  }
  ctx.strokeStyle = rgba(PAL.gold, 0.85); ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
  // a short flash sweeping across while it lands
  if (t < 600) {
    const sx = x + (t / 600) * (w + 60) - 30;
    const fg = ctx.createLinearGradient(sx - 30, y, sx + 30, y);
    fg.addColorStop(0, 'rgba(255,246,208,0)');
    fg.addColorStop(0.5, 'rgba(255,246,208,0.45)');
    fg.addColorStop(1, 'rgba(255,246,208,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(Math.max(x, sx - 30), y + 2, Math.min(60, x + w - (sx - 30)), h - 4);
  }
  // portrait
  drawPortrait(ctx, fx.hero, x + 24, y + h / 2, 16, mine ? 0 : 1, dpr);
  // text
  const tx = x + 48;
  const maxW = w - 48 - 56;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PAL.gold;
  ctx.font = '800 9.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('U L T I M A T E', tx, y + 14);
  ctx.font = '700 15px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#fff8e6';
  const name = fitText(ctx, def.name, maxW * 0.45);
  ctx.fillText(name, tx, y + 32);
  const nw = ctx.measureText(name).width;
  ctx.font = 'italic 700 14px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(fitText(ctx, ` · ${def.ult.name}`, maxW - nw), tx + nw, y + 32);
  // side tag
  ctx.textAlign = 'right';
  ctx.font = '800 9.5px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = mine ? '#9cc0ff' : '#f4a28c';
  ctx.fillText(mine ? 'YOURS' : 'ENEMY', x + w - 10, y + 14);
  ctx.restore();
}
