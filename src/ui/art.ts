// "Hikayat" art style (DEC-010): a hand-painted folk-tale board game seen from above.
// Everything is drawn in code: ink-outlined tokens with class glyphs, timber forts, a painted
// rainforest map (drawn once and cached), batik/songket accents. Drawing only; no game rules.
import { CAMPS, DENS, BOSS_PIT, FIELD, LANES, LANE_HALF, RIVER, SHRINES, WARD_SPOTS, inJungle, pointAt } from '../game/map';
import { Rng } from '../game/math';
import type { SpeciesId } from '../game/rules';
import type { Sim } from '../game/sim';
import { type Layout, toScreen } from './layout';

export const PAL = {
  ink: '#1d140e',
  jungle: '#24533a', jungleDark: '#183d2a', jungleLight: '#33704b',
  canopy: '#1f4c33', canopyLight: '#3f8a52', canopyShade: '#11301f',
  clay: '#a8653d', clayLight: '#c98a57', clayDark: '#7a4527',
  river: '#2a8496', riverLight: '#6cc4c9', sand: '#d8b77d',
  wood: '#6b4426', woodLight: '#93643b', woodDark: '#3f2717',
  gold: '#e0b04a', goldDark: '#a57a24', maroon: '#5a1e1e',
  parchment: '#f3e6c4', parchmentDark: '#e2cf9f',
  you: '#2f5fb3', youLight: '#9cc0ff', youDark: '#1d3d78',
  foe: '#c0392b', foeLight: '#f4a28c', foeDark: '#7d2219',
  neutral: '#8a6a2f',
} as const;

export const SPECIES_COLORS: Record<SpeciesId, string> = {
  kampung: '#c0843d', hutan: '#4f8a3b', sungai: '#2f8fa3', serangga: '#b5892a', batu: '#7d7f86',
};

export type Glyph =
  | 'spear' | 'bow' | 'shield' | 'horns' | 'monkey' | 'paw' | 'beak' | 'gaur' | 'claw' | 'fish' | 'bolt' | 'ant' | 'bee'
  | 'beetle' | 'crown' | 'pebble' | 'boulder' | 'sling' | 'mask' | 'hut' | 'trunk' | 'fruit' | 'cave' | 'lantern' | 'gem'
  | 'heart' | 'roar' | 'wave' | 'sting' | 'crack' | 'dot';

// ---------- glyphs: drawn in a box from -1 to 1, scaled to `s` ----------

export function glyph(ctx: CanvasRenderingContext2D, g: Glyph, x: number, y: number, s: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const P = new Path2D();
  const circle = (cx: number, cy: number, r: number) => { P.moveTo(cx + r, cy); P.arc(cx, cy, r, 0, Math.PI * 2); };
  let fill = true;
  switch (g) {
    case 'spear':
      ctx.beginPath(); ctx.moveTo(-0.75, 0.75); ctx.lineTo(0.35, -0.35); ctx.stroke();
      P.moveTo(0.85, -0.85); P.lineTo(0.15, -0.55); P.lineTo(0.55, -0.15); P.closePath();
      break;
    case 'bow':
      ctx.beginPath(); ctx.arc(0.25, 0, 0.85, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke();
      ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(-0.15, -0.79); ctx.lineTo(-0.15, 0.79); ctx.stroke();
      ctx.lineWidth = 0.16; ctx.beginPath(); ctx.moveTo(-0.6, 0); ctx.lineTo(0.75, 0); ctx.stroke();
      P.moveTo(0.95, 0); P.lineTo(0.6, -0.22); P.lineTo(0.6, 0.22); P.closePath();
      break;
    case 'shield':
      P.moveTo(0, -0.9); P.quadraticCurveTo(0.45, -0.6, 0.8, -0.65); P.quadraticCurveTo(0.8, 0.45, 0, 0.95); P.quadraticCurveTo(-0.8, 0.45, -0.8, -0.65); P.quadraticCurveTo(-0.45, -0.6, 0, -0.9); P.closePath();
      break;
    case 'horns':
    case 'gaur': {
      const wide = g === 'gaur' ? 1.1 : 0.95;
      ctx.lineWidth = 0.24;
      ctx.beginPath(); ctx.moveTo(-0.25, -0.1); ctx.quadraticCurveTo(-wide, -0.2, -wide * 0.75, -0.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.25, -0.1); ctx.quadraticCurveTo(wide, -0.2, wide * 0.75, -0.85); ctx.stroke();
      P.ellipse(0, 0.25, 0.42, 0.55, 0, 0, Math.PI * 2);
      break;
    }
    case 'monkey':
      circle(0, 0.1, 0.55); circle(-0.62, -0.05, 0.25); circle(0.62, -0.05, 0.25);
      break;
    case 'paw':
      P.ellipse(0, 0.35, 0.45, 0.38, 0, 0, Math.PI * 2);
      circle(-0.55, -0.2, 0.18); circle(-0.2, -0.55, 0.18); circle(0.2, -0.55, 0.18); circle(0.55, -0.2, 0.18);
      break;
    case 'beak':
      P.moveTo(-0.8, 0.1); P.quadraticCurveTo(-0.2, -0.95, 0.9, -0.15); P.quadraticCurveTo(0.2, -0.3, -0.1, 0.35); P.closePath();
      circle(-0.45, 0.45, 0.28);
      break;
    case 'claw':
      ctx.lineWidth = 0.32;
      ctx.beginPath(); ctx.arc(0, 0.1, 0.65, Math.PI * 1.15, Math.PI * 1.95); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0.1, 0.65, Math.PI * 0.05, Math.PI * 0.85); ctx.stroke();
      fill = false;
      break;
    case 'fish':
      P.ellipse(-0.1, 0, 0.62, 0.38, 0, 0, Math.PI * 2);
      P.moveTo(0.45, 0); P.lineTo(0.95, -0.4); P.lineTo(0.95, 0.4); P.closePath();
      break;
    case 'bolt':
      P.moveTo(0.15, -0.95); P.lineTo(-0.55, 0.1); P.lineTo(-0.05, 0.1); P.lineTo(-0.2, 0.95); P.lineTo(0.55, -0.15); P.lineTo(0.05, -0.15); P.closePath();
      break;
    case 'ant':
      circle(0, -0.55, 0.25); circle(0, -0.05, 0.22); P.ellipse(0, 0.5, 0.3, 0.38, 0, 0, Math.PI * 2);
      ctx.lineWidth = 0.1;
      for (const yy of [-0.25, 0, 0.25]) { ctx.beginPath(); ctx.moveTo(-0.7, yy - 0.15); ctx.lineTo(0.7, yy + 0.15); ctx.stroke(); }
      break;
    case 'bee':
      P.ellipse(0, 0.2, 0.35, 0.55, 0, 0, Math.PI * 2);
      P.ellipse(-0.55, -0.35, 0.38, 0.22, -0.5, 0, Math.PI * 2);
      P.ellipse(0.55, -0.35, 0.38, 0.22, 0.5, 0, Math.PI * 2);
      break;
    case 'beetle':
      P.ellipse(0, 0.2, 0.55, 0.65, 0, 0, Math.PI * 2);
      P.moveTo(-0.12, -0.4); P.lineTo(0, -0.98); P.lineTo(0.12, -0.4); P.closePath();
      break;
    case 'crown':
      P.moveTo(-0.85, 0.55); P.lineTo(-0.85, -0.45); P.lineTo(-0.45, 0.05); P.lineTo(0, -0.7); P.lineTo(0.45, 0.05); P.lineTo(0.85, -0.45); P.lineTo(0.85, 0.55); P.closePath();
      break;
    case 'pebble':
      circle(-0.45, 0.3, 0.32); circle(0.4, 0.35, 0.28); circle(0, -0.35, 0.36);
      break;
    case 'boulder':
      P.moveTo(-0.8, 0.3); P.lineTo(-0.55, -0.55); P.lineTo(0.1, -0.85); P.lineTo(0.75, -0.35); P.lineTo(0.85, 0.35); P.lineTo(0.2, 0.85); P.lineTo(-0.45, 0.75); P.closePath();
      break;
    case 'sling':
      ctx.lineWidth = 0.22;
      ctx.beginPath(); ctx.moveTo(0, 0.95); ctx.lineTo(0, 0.05); ctx.lineTo(-0.6, -0.75); ctx.moveTo(0, 0.05); ctx.lineTo(0.6, -0.75); ctx.stroke();
      circle(0, -0.55, 0.22);
      break;
    case 'mask':
      P.ellipse(0, 0, 0.62, 0.85, 0, 0, Math.PI * 2);
      break;
    case 'hut':
      P.moveTo(-0.85, -0.05); P.lineTo(0, -0.85); P.lineTo(0.85, -0.05); P.lineTo(0.6, -0.05); P.lineTo(0.6, 0.85); P.lineTo(-0.6, 0.85); P.lineTo(-0.6, -0.05); P.closePath();
      break;
    case 'trunk':
      circle(-0.15, -0.3, 0.55);
      ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(0.25, -0.1); ctx.quadraticCurveTo(0.75, 0.3, 0.45, 0.9); ctx.stroke();
      break;
    case 'fruit':
      circle(0, 0.2, 0.62);
      P.moveTo(0.05, -0.4); P.quadraticCurveTo(0.6, -1.0, 0.75, -0.55); P.quadraticCurveTo(0.35, -0.35, 0.05, -0.4);
      break;
    case 'cave':
      P.moveTo(-0.9, 0.75); P.quadraticCurveTo(-0.85, -0.85, 0, -0.85); P.quadraticCurveTo(0.85, -0.85, 0.9, 0.75); P.closePath();
      break;
    case 'lantern':
      P.rect(-0.38, -0.5, 0.76, 0.95); P.rect(-0.5, -0.7, 1, 0.2); P.rect(-0.5, 0.45, 1, 0.2);
      break;
    case 'gem':
      P.moveTo(0, -0.95); P.lineTo(0.75, -0.2); P.lineTo(0, 0.95); P.lineTo(-0.75, -0.2); P.closePath();
      break;
    case 'heart':
      P.moveTo(0, 0.85); P.bezierCurveTo(-1.1, 0.05, -0.55, -0.95, 0, -0.35); P.bezierCurveTo(0.55, -0.95, 1.1, 0.05, 0, 0.85); P.closePath();
      break;
    case 'roar':
      ctx.lineWidth = 0.2;
      for (const r of [0.35, 0.6, 0.85]) { ctx.beginPath(); ctx.arc(-0.6, 0, r + 0.2, -0.9, 0.9); ctx.stroke(); }
      fill = false;
      break;
    case 'wave':
      ctx.lineWidth = 0.24;
      for (const yy of [-0.35, 0.3]) {
        ctx.beginPath(); ctx.moveTo(-0.9, yy);
        ctx.quadraticCurveTo(-0.45, yy - 0.45, 0, yy); ctx.quadraticCurveTo(0.45, yy + 0.45, 0.9, yy); ctx.stroke();
      }
      fill = false;
      break;
    case 'sting':
      P.moveTo(-0.5, -0.8); P.lineTo(0.5, -0.8); P.lineTo(0, 0.95); P.closePath();
      break;
    case 'crack':
      ctx.lineWidth = 0.24;
      ctx.beginPath(); ctx.moveTo(-0.2, -0.95); ctx.lineTo(0.2, -0.35); ctx.lineTo(-0.25, 0.1); ctx.lineTo(0.25, 0.5); ctx.lineTo(-0.05, 0.95); ctx.stroke();
      fill = false;
      break;
    case 'dot':
      circle(0, 0, 0.35);
      break;
  }
  if (fill) ctx.fill(P);
  ctx.restore();
}

// ---------- tokens ----------

export function teamColors(owner: number): { base: string; light: string; dark: string } {
  if (owner === 0) return { base: PAL.you, light: PAL.youLight, dark: PAL.youDark };
  if (owner === 1) return { base: PAL.foe, light: PAL.foeLight, dark: PAL.foeDark };
  return { base: PAL.neutral, light: PAL.gold, dark: PAL.woodDark };
}

/** Songket-style zigzag band (gold on maroon) for frames and HUD edges. */
export function songket(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.fillStyle = PAL.maroon;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 1.2;
  const step = h * 1.2;
  ctx.beginPath();
  for (let i = 0, xx = x; xx < x + w + step; i++, xx += step) {
    ctx.moveTo(xx, y + h * 0.5);
    ctx.lineTo(xx + step / 2, y + h * 0.15);
    ctx.lineTo(xx + step, y + h * 0.5);
    ctx.lineTo(xx + step / 2, y + h * 0.85);
    ctx.closePath();
  }
  ctx.stroke();
  ctx.fillStyle = PAL.gold;
  for (let xx = x + step / 2; xx < x + w; xx += step) {
    ctx.beginPath(); ctx.arc(xx, y + h * 0.5, h * 0.09, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** A timber fort ("kubu") seen from above: a hip roof in team cloth with a gold ridge cap. */
export function kubu(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, owner: number, alive: boolean): void {
  const c = teamColors(owner);
  ctx.save();
  ctx.fillStyle = 'rgba(10,20,10,0.4)';
  ctx.fillRect(x - s / 2 + 3, y - s / 2 + 4, s, s);
  if (!alive) {
    // rubble
    ctx.fillStyle = '#6d6259';
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1.2;
    const rng = new Rng(Math.round(x * 31 + y));
    for (let i = 0; i < 6; i++) {
      const px = x - s / 2 + rng.int(Math.max(1, Math.round(s)));
      const py = y - s / 2 + rng.int(Math.max(1, Math.round(s)));
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + s * 0.25, py + 2); ctx.lineTo(px + s * 0.12, py + s * 0.2); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    return;
  }
  // stilts / deck
  ctx.fillStyle = PAL.wood;
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 1.5;
  ctx.fillRect(x - s / 2, y - s / 2, s, s);
  ctx.strokeRect(x - s / 2, y - s / 2, s, s);
  // hip roof: four triangles, lit from the top left
  const r = s * 0.42;
  const tri = (ax: number, ay: number, bx: number, by: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ax, ay); ctx.lineTo(bx, by); ctx.closePath(); ctx.fill(); ctx.stroke();
  };
  tri(x - r, y - r, x + r, y - r, c.light);
  tri(x - r, y - r, x - r, y + r, c.base);
  tri(x + r, y - r, x + r, y + r, c.base);
  tri(x - r, y + r, x + r, y + r, c.dark);
  // gold ridge cap with curved horn tips
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = Math.max(1.5, s * 0.08);
  ctx.beginPath(); ctx.moveTo(x - r * 0.95, y - r * 0.95); ctx.lineTo(x + r * 0.95, y + r * 0.95); ctx.moveTo(x + r * 0.95, y - r * 0.95); ctx.lineTo(x - r * 0.95, y + r * 0.95); ctx.stroke();
  ctx.fillStyle = PAL.gold;
  ctx.beginPath(); ctx.arc(x, y, s * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** The Pusaka: a hexagonal pavilion sheltering a golden heirloom. */
export function pusaka(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, owner: number, alive: boolean): void {
  const c = teamColors(owner);
  ctx.save();
  const hex = (r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      const px = x + Math.cos(a) * r * 1.35;
      const py = y + Math.sin(a) * r * 0.85;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  ctx.fillStyle = 'rgba(10,20,10,0.4)';
  ctx.save(); ctx.translate(3, 5); hex(s * 0.5); ctx.fill(); ctx.restore();
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 1.6;
  ctx.fillStyle = alive ? PAL.woodLight : '#6d6259';
  hex(s * 0.5); ctx.fill(); ctx.stroke();
  if (!alive) { ctx.restore(); return; }
  ctx.fillStyle = c.base;
  hex(s * 0.38); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 1.4;
  hex(s * 0.3); ctx.stroke();
  // the heirloom: a gold keris-like blade shape
  ctx.fillStyle = PAL.gold;
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.06, y + s * 0.14);
  ctx.quadraticCurveTo(x - s * 0.12, y - s * 0.02, x - s * 0.02, y - s * 0.08);
  ctx.quadraticCurveTo(x + s * 0.08, y - s * 0.16, x + s * 0.02, y - s * 0.24);
  ctx.quadraticCurveTo(x + s * 0.14, y - s * 0.1, x + s * 0.06, y + s * 0.14);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ---------- the painted map (cached) ----------

export class MapPainter {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';
  private res = 1;

  /** The painted field for this screen size and lane setup: the whole map at zoom 1, drawn once,
   *  at extra resolution so it stays sharp when the camera zooms in (DEC-016). */
  get(l: Layout, sim: Sim): HTMLCanvasElement {
    const key = `${Math.round(l.field.w)}x${Math.round(l.field.h)}@${l.dpr}/${sim.laneCount}`;
    if (this.canvas && this.key === key) return this.canvas;
    // Up to 2x the screen density, but no more than ~3.5 million pixels (phone memory).
    const area = Math.max(1, l.field.w * l.field.h);
    this.res = Math.max(1, Math.min(l.dpr * 2, Math.sqrt(3_500_000 / area)));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(l.field.w * this.res));
    c.height = Math.max(1, Math.round(l.field.h * this.res));
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.setTransform(this.res, 0, 0, this.res, 0, 0);
      paintField(ctx, { ...l, scale: l.baseScale, vx: FIELD.minX, vy: FIELD.minY }, sim);
    }
    this.canvas = c;
    this.key = key;
    return c;
  }

  /** Draw the part of the painted map the camera sees into the field. */
  draw(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim): void {
    const c = this.get(l, sim);
    const k = this.res * l.baseScale; // cache pixels per world unit
    const sx = (l.vx - FIELD.minX) * k;
    const sy = (l.vy - FIELD.minY) * k;
    const sw = (l.field.w / l.scale) * k;
    const sh = (l.field.h / l.scale) * k;
    ctx.drawImage(c, sx, sy, sw, sh, l.field.x, l.field.y, l.field.w, l.field.h);
  }
}

function paintField(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim): void {
  const W = l.field.w;
  const H = l.field.h;
  // local coordinates: field origin at 0,0
  const at = (wx: number, wy: number): [number, number] => {
    const [x, y] = toScreen(l, wx, wy);
    return [x - l.field.x, y - l.field.y];
  };
  const sc = l.scale;
  const rng = new Rng(20261112);

  // ground
  ctx.fillStyle = PAL.jungle;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const x = rng.int(Math.round(W));
    const y = rng.int(Math.round(H));
    const r = 6 + rng.int(26);
    ctx.fillStyle = i % 2 ? 'rgba(16,48,30,0.35)' : 'rgba(70,130,80,0.18)';
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r, rng.int(314) / 100, 0, Math.PI * 2); ctx.fill();
  }

  // river with sandy banks and ripples
  const [, ry0] = at(0, RIVER.y - RIVER.halfWidth);
  const rh = RIVER.halfWidth * 2 * sc;
  ctx.fillStyle = PAL.sand;
  ctx.fillRect(0, ry0 - 3, W, rh + 6);
  const grad = ctx.createLinearGradient(0, ry0, 0, ry0 + rh);
  grad.addColorStop(0, '#237284');
  grad.addColorStop(0.5, PAL.river);
  grad.addColorStop(1, '#237284');
  ctx.fillStyle = grad;
  ctx.fillRect(0, ry0, W, rh);
  ctx.strokeStyle = 'rgba(160,225,228,0.55)';
  ctx.lineWidth = 1.2;
  for (let row = 0; row < 3; row++) {
    const yy = ry0 + rh * (0.25 + row * 0.25);
    ctx.beginPath();
    for (let x = -10; x < W + 10; x += 14) {
      const off = row % 2 ? 7 : 0;
      ctx.moveTo(x + off, yy);
      ctx.quadraticCurveTo(x + off + 3.5, yy - 2.5, x + off + 7, yy);
    }
    ctx.stroke();
  }

  // trees in the jungle: clustered canopies, lit from the top left
  const trees: [number, number, number][] = [];
  for (let i = 0; i < 1400 && trees.length < 150; i++) {
    const wx = 100 + rng.int(3700);
    const wy = FIELD.minY + 100 + rng.int(FIELD.maxY - FIELD.minY - 200);
    if (Math.abs(wy - RIVER.y) < RIVER.halfWidth + 140) continue;
    if (!inJungle(wx, wy, sim.lanes)) continue;
    const near = [...CAMPS, ...DENS, BOSS_PIT, ...WARD_SPOTS, ...SHRINES].some(([cx, cy]) => (cx - wx) ** 2 + (cy - wy) ** 2 < 260 * 260);
    if (near) continue;
    trees.push([wx, wy, 80 + rng.int(90)]);
  }
  for (const [wx, wy, r] of trees) {
    const [x, y] = at(wx, wy);
    const rr = r * sc;
    ctx.fillStyle = PAL.canopyShade;
    ctx.beginPath(); ctx.arc(x + rr * 0.25, y + rr * 0.3, rr, 0, Math.PI * 2); ctx.fill();
  }
  for (const [wx, wy, r] of trees) {
    const [x, y] = at(wx, wy);
    const rr = r * sc;
    ctx.fillStyle = PAL.canopy;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.arc(x - rr * 0.55, y + rr * 0.2, rr * 0.7, 0, Math.PI * 2);
    ctx.arc(x + rr * 0.5, y + rr * 0.25, rr * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.canopyLight;
    ctx.beginPath(); ctx.arc(x - rr * 0.3, y - rr * 0.35, rr * 0.38, 0, Math.PI * 2); ctx.fill();
  }

  // lanes: dark rim, red laterite path, lighter worn centre, pebbles
  const lanePath = (id: number) => {
    ctx.beginPath();
    LANES[id].pts.forEach(([wx, wy], i) => { const [x, y] = at(wx, wy); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  };
  const lw = LANE_HALF * 2 * sc;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const id of sim.lanes) { lanePath(id); ctx.lineWidth = lw + 5; ctx.strokeStyle = PAL.clayDark; ctx.stroke(); }
  for (const id of sim.lanes) { lanePath(id); ctx.lineWidth = lw; ctx.strokeStyle = PAL.clay; ctx.stroke(); }
  for (const id of sim.lanes) { lanePath(id); ctx.lineWidth = lw * 0.45; ctx.strokeStyle = PAL.clayLight; ctx.stroke(); }
  ctx.fillStyle = 'rgba(70,35,15,0.45)';
  for (const id of sim.lanes) {
    const lane = LANES[id];
    for (let s = 60; s < lane.length; s += 110) {
      const [wx, wy] = pointAt(lane, s);
      const [x, y] = at(wx + (rng.int(400) - 200), wy + (rng.int(400) - 200));
      ctx.beginPath(); ctx.arc(x, y, 1 + rng.int(2), 0, Math.PI * 2); ctx.fill();
    }
  }

  // bridges: timber planks where lanes cross the river
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, ry0 - 2, W, rh + 4);
  ctx.clip();
  for (const id of sim.lanes) { lanePath(id); ctx.lineWidth = lw * 0.9; ctx.strokeStyle = PAL.woodLight; ctx.stroke(); }
  ctx.strokeStyle = PAL.woodDark;
  ctx.lineWidth = 1;
  for (let y = ry0 + 2; y < ry0 + rh; y += 4) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.globalAlpha = 0.25; ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.restore();

  // clearings and landmarks
  const clearing = (wx: number, wy: number, r: number, col: string) => {
    const [x, y] = at(wx, wy);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y, r * sc * 1.15, r * sc, 0, 0, Math.PI * 2); ctx.fill();
  };
  for (const [wx, wy] of CAMPS) clearing(wx, wy, 230, 'rgba(216,183,125,0.55)');
  for (const [wx, wy] of DENS) {
    clearing(wx, wy, 250, 'rgba(60,45,35,0.55)');
    const [x, y] = at(wx, wy);
    ctx.fillStyle = '#2a211b';
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y - 4, 160 * sc, 110 * sc, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  {
    // Gajah Mina's pool under the middle bridge (or open river when there is no middle lane)
    const [x, y] = at(BOSS_PIT[0], BOSS_PIT[1]);
    ctx.fillStyle = 'rgba(14,60,80,0.75)';
    ctx.beginPath(); ctx.ellipse(x, y, 260 * sc, 190 * sc, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8f8778';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const [wx, wy] of WARD_SPOTS) {
    const [x, y] = at(wx, wy);
    ctx.fillStyle = '#9a9184';
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y + 2, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y - 2, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  for (const [wx, wy] of SHRINES) {
    const [x, y] = at(wx, wy);
    ctx.strokeStyle = '#b9ad95';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  // soft vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}
