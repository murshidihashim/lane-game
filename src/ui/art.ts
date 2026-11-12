// "Batik paper" art style (DEC-018): a paper-cut diorama of a folk-tale board seen from above.
// Everything is drawn in code: a batik-printed jungle cloth, cut-paper leaf canopies, kraft-paper
// lanes, folded-paper forts, die-cut paper standees, all with soft paper shadows, on indigo batik
// cloth menus. The map is painted once and cached; forts and figures are cached too.
// Drawing only; no game rules.
import { CAMPS, DENS, BOSS_PIT, FIELD, LANES, LANE_HALF, RIVER, SHRINES, WARD_SPOTS, inJungle, pointAt } from '../game/map';
import { Rng } from '../game/math';
import type { SpeciesId } from '../game/rules';
import type { Sim } from '../game/sim';
import { type Layout, toScreen } from './layout';

export const PAL = {
  ink: '#221a2c', // indigo-black ink for outlines and text
  jungle: '#2d5a47', jungleDark: '#1f4535', jungleLight: '#3f7a5d',
  canopy: '#2f6b4c', canopyLight: '#4f9a68', canopyShade: '#163a2b',
  clay: '#c98f55', clayLight: '#e6c08a', clayDark: '#8a5a2e', // kraft paper (lanes)
  river: '#2a7f94', riverLight: '#8fd0d4', sand: '#ead8b0',
  wood: '#7b4a22', woodLight: '#a8703c', woodDark: '#4a2a14', // soga brown (batik dye)
  gold: '#e0b04a', goldDark: '#a57a24', maroon: '#6b1f2a',
  parchment: '#f4ead6', parchmentDark: '#e0d0ac', // paper cards
  paperEdge: '#fbf7ec', // the white cut edge of every paper piece
  indigo: '#1b2742', indigoDark: '#111a2f', indigoLight: '#2c3f66', // batik indigo cloth
  you: '#2f5fb3', youLight: '#9cc0ff', youDark: '#1d3d78',
  foe: '#c0392b', foeLight: '#f4a28c', foeDark: '#7d2219',
  neutral: '#8a6a2f',
} as const;

const TAU = Math.PI * 2;

// ---------- batik paper helpers ----------

/** A batik "bunga" motif: four petals around a dot (kawung-like), at (x, y) with radius r. */
export function batikFlower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.26, a, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, TAU); ctx.fill();
}

/** One tile of printed batik cloth (64 CSS px square), drawn at `k` device pixels per CSS px.
 *  `ground` fills the background first; motifs sit on the corners and centre so the tile repeats seamlessly. */
function batikTile(k: number, ground: string | null, motif: string, dots: string): HTMLCanvasElement {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(8, Math.round(size * k));
  const g = c.getContext('2d');
  if (!g) return c;
  g.setTransform(c.width / size, 0, 0, c.height / size, 0, 0);
  if (ground) { g.fillStyle = ground; g.fillRect(0, 0, size, size); }
  for (const [x, y] of [[0, 0], [size, 0], [0, size], [size, size], [size / 2, size / 2]]) batikFlower(g, x, y, 11, motif);
  g.fillStyle = dots;
  for (const [x, y] of [[size / 2, 0], [0, size / 2], [size, size / 2], [size / 2, size]]) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      g.beginPath(); g.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 1.1, 0, TAU); g.fill();
    }
  }
  g.strokeStyle = dots;
  g.lineWidth = 0.8;
  for (const [x, y] of [[size / 4, size / 4], [(3 * size) / 4, size / 4], [size / 4, (3 * size) / 4], [(3 * size) / 4, (3 * size) / 4]]) {
    g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x + 3, y); g.lineTo(x, y + 3); g.lineTo(x - 3, y); g.closePath(); g.stroke();
  }
  return c;
}

const clothCache = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasPattern>>();

/**
 * A repeating batik pattern for this context, drawn at `k` device px per CSS px; `userPerCss` is how
 * many of the context's user units make one CSS px (1 when its transform already scales by k).
 * 'cloth': indigo cloth (menus, screen edges). 'fog': motifs only, laid over the fog's indigo wash.
 */
export function batikPattern(ctx: CanvasRenderingContext2D, kind: 'cloth' | 'fog', k: number, userPerCss = 1): CanvasPattern | string {
  let m = clothCache.get(ctx);
  if (!m) { m = new Map(); clothCache.set(ctx, m); }
  const key = `${kind}@${Math.round(k * 100)}/${Math.round(userPerCss * 100)}`;
  const hit = m.get(key);
  if (hit) return hit;
  const tile = kind === 'cloth'
    ? batikTile(k, PAL.indigo, 'rgba(120,150,215,0.16)', 'rgba(170,190,235,0.16)')
    : batikTile(k, null, 'rgba(150,175,240,0.10)', 'rgba(150,175,240,0.08)');
  const pat = ctx.createPattern(tile, 'repeat');
  if (!pat) return PAL.indigo;
  const z = userPerCss / k; // tile pixels -> the context's user units
  pat.setTransform(new DOMMatrix([z, 0, 0, z, 0, 0]));
  m.set(key, pat);
  return pat;
}

const scratch: HTMLCanvasElement[] = [];
function scratchCanvas(i: number, w: number, h: number): CanvasRenderingContext2D | null {
  const c = scratch[i] ?? (scratch[i] = document.createElement('canvas'));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext('2d');
  if (!g) return null;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, w, h);
  return g;
}

/**
 * Die-cut paper: whatever `draw` paints (using ctx's current transform) is stamped onto ctx with a
 * white cut edge `edge` device px wide and a soft paper shadow. Meant for cached bitmaps, not for
 * every frame.
 */
export function cutOut(ctx: CanvasRenderingContext2D, edge: number, draw: (c: CanvasRenderingContext2D) => void): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const art = scratchCanvas(0, w, h);
  const rim = scratchCanvas(1, w, h);
  if (!art || !rim) { draw(ctx); return; }
  art.setTransform(ctx.getTransform());
  draw(art);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    rim.drawImage(art.canvas, Math.cos(a) * edge, Math.sin(a) * edge);
  }
  rim.globalCompositeOperation = 'source-in';
  rim.fillStyle = PAL.paperEdge;
  rim.fillRect(0, 0, w, h);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.shadowColor = 'rgba(16,14,34,0.42)';
  ctx.shadowBlur = edge * 1.6;
  ctx.shadowOffsetX = edge * 0.8;
  ctx.shadowOffsetY = edge * 1.2;
  ctx.drawImage(rim.canvas, 0, 0);
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.drawImage(art.canvas, 0, 0);
  ctx.restore();
}

/** Turn a paper shadow on (sizes in CSS px; `k` = device px per CSS px) or off. */
function paperShadow(ctx: CanvasRenderingContext2D, k: number, blur: number, dx: number, dy: number, a = 0.4): void {
  ctx.shadowColor = `rgba(16,14,34,${a})`;
  ctx.shadowBlur = blur * k;
  ctx.shadowOffsetX = dx * k;
  ctx.shadowOffsetY = dy * k;
}
function noShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
}

/** Batik dots printed inside the current path (call after building a path). */
function printDots(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, step: number, r: number, color: string): void {
  ctx.save();
  ctx.clip();
  ctx.fillStyle = color;
  let row = 0;
  for (let y = y0; y <= y1; y += step, row++) {
    for (let x = x0 + (row % 2) * step * 0.5; x <= x1; x += step) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

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

// ---------- forts (cached paper pieces) ----------

const pieceCache = new Map<string, HTMLCanvasElement>();

/** Draws a cached piece centred on (x, y): `paint` draws it centred on 0,0 in CSS px at size s. */
function stamp(ctx: CanvasRenderingContext2D, key: string, x: number, y: number, s: number, paint: (c: CanvasRenderingContext2D, k: number) => void): void {
  const k = Math.max(1, ctx.getTransform().a);
  const half = s * 0.9 + 8;
  const full = `${key}|${Math.round(s)}|${Math.round(k * 100)}`;
  let cv = pieceCache.get(full);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = cv.height = Math.max(1, Math.ceil(half * 2 * k));
    const c = cv.getContext('2d');
    if (c) { c.setTransform(k, 0, 0, k, half * k, half * k); paint(c, k); }
    if (pieceCache.size > 200) pieceCache.clear();
    pieceCache.set(full, cv);
  }
  ctx.drawImage(cv, x - half, y - half, half * 2, half * 2);
}

/** A folded-paper fort ("kubu") seen from above: a paper deck and a batik-printed hip roof in team colours. */
export function kubu(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, owner: number, alive: boolean): void {
  stamp(ctx, `kubu|${owner}|${alive ? 1 : 0}`, x, y, s, (c, k) => {
    const t = teamColors(owner);
    if (!alive) {
      // torn paper scraps
      const rng = new Rng(owner * 97 + 13);
      paperShadow(c, k, 2, 1, 1.5);
      for (let i = 0; i < 7; i++) {
        const px = -s / 2 + rng.int(Math.max(1, Math.round(s)));
        const py = -s / 2 + rng.int(Math.max(1, Math.round(s)));
        c.fillStyle = i % 3 === 0 ? t.base : i % 3 === 1 ? PAL.parchment : PAL.parchmentDark;
        c.beginPath(); c.moveTo(px, py); c.lineTo(px + s * 0.26, py + 2); c.lineTo(px + s * 0.1, py + s * 0.22); c.closePath(); c.fill();
      }
      noShadow(c);
      return;
    }
    // paper deck with a soga border
    paperShadow(c, k, 4, 2, 3.5, 0.45);
    c.fillStyle = PAL.paperEdge;
    c.fillRect(-s / 2 - 1.5, -s / 2 - 1.5, s + 3, s + 3);
    noShadow(c);
    c.fillStyle = PAL.parchment;
    c.fillRect(-s / 2, -s / 2, s, s);
    c.strokeStyle = PAL.wood;
    c.lineWidth = 1;
    c.strokeRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4);
    // hip roof: four folded triangles, lit from the top left, each printed with batik dots
    const r = s * 0.42;
    const tri = (ax: number, ay: number, bx: number, by: number, col: string, dots: string) => {
      c.beginPath(); c.moveTo(0, 0); c.lineTo(ax, ay); c.lineTo(bx, by); c.closePath();
      c.fillStyle = col; c.fill();
      printDots(c, -r, -r, r, r, Math.max(3, s * 0.11), Math.max(0.5, s * 0.022), dots);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(ax, ay); c.lineTo(bx, by); c.closePath();
      c.strokeStyle = PAL.paperEdge; c.lineWidth = 1; c.stroke();
    };
    paperShadow(c, k, 2, 1, 1.5, 0.35);
    c.fillStyle = t.dark;
    c.fillRect(-r, -r, r * 2, r * 2);
    noShadow(c);
    tri(-r, -r, r, -r, t.light, 'rgba(255,255,255,0.35)');
    tri(-r, -r, -r, r, t.base, 'rgba(255,255,255,0.25)');
    tri(r, -r, r, r, t.base, 'rgba(255,255,255,0.25)');
    tri(-r, r, r, r, t.dark, 'rgba(255,255,255,0.18)');
    c.strokeStyle = PAL.ink; c.lineWidth = 0.8;
    c.strokeRect(-r, -r, r * 2, r * 2);
    // gold ridge cap
    c.strokeStyle = PAL.gold;
    c.lineWidth = Math.max(1.5, s * 0.07);
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(-r * 0.95, -r * 0.95); c.lineTo(r * 0.95, r * 0.95); c.moveTo(r * 0.95, -r * 0.95); c.lineTo(-r * 0.95, r * 0.95); c.stroke();
    c.fillStyle = PAL.gold;
    c.beginPath(); c.arc(0, 0, s * 0.11, 0, TAU); c.fill();
    c.strokeStyle = PAL.ink; c.lineWidth = 0.8; c.stroke();
  });
}

/** The Pusaka: a layered paper pavilion sheltering a golden heirloom. */
export function pusaka(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, owner: number, alive: boolean): void {
  stamp(ctx, `pusaka|${owner}|${alive ? 1 : 0}`, x, y, s, (c, k) => {
    const t = teamColors(owner);
    const hex = (rad: number) => {
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        const px = Math.cos(a) * rad * 1.35;
        const py = Math.sin(a) * rad * 0.85;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath();
    };
    paperShadow(c, k, 5, 2.5, 4, 0.45);
    c.fillStyle = PAL.paperEdge;
    hex(s * 0.5 + 1.5); c.fill();
    noShadow(c);
    c.fillStyle = alive ? PAL.woodLight : '#8d8475';
    hex(s * 0.5); c.fill();
    if (!alive) return;
    hex(s * 0.5); printDots(c, -s, -s, s, s, Math.max(3, s * 0.09), Math.max(0.5, s * 0.018), 'rgba(255,240,210,0.3)');
    paperShadow(c, k, 2.5, 1, 2, 0.4);
    c.fillStyle = t.base;
    hex(s * 0.38); c.fill();
    noShadow(c);
    hex(s * 0.38); printDots(c, -s, -s, s, s, Math.max(3, s * 0.08), Math.max(0.5, s * 0.016), 'rgba(255,255,255,0.25)');
    hex(s * 0.38); c.strokeStyle = PAL.paperEdge; c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = PAL.gold;
    c.lineWidth = 1.4;
    hex(s * 0.3); c.stroke();
    // the heirloom: a gold keris-like blade shape
    c.fillStyle = PAL.gold;
    c.strokeStyle = PAL.ink;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-s * 0.06, s * 0.14);
    c.quadraticCurveTo(-s * 0.12, -s * 0.02, -s * 0.02, -s * 0.08);
    c.quadraticCurveTo(s * 0.08, -s * 0.16, s * 0.02, -s * 0.24);
    c.quadraticCurveTo(s * 0.14, -s * 0.1, s * 0.06, s * 0.14);
    c.closePath(); c.fill(); c.stroke();
  });
}

// ---------- the paper map (cached) ----------

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
      paintField(ctx, { ...l, scale: l.baseScale, vx: FIELD.minX, vy: FIELD.minY }, sim, this.res);
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

/** A paper leaf (teardrop) from (x, y) pointing at angle a, length len. */
function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, len: number, wid: number): void {
  const tx = x + Math.cos(a) * len;
  const ty = y + Math.sin(a) * len;
  const nx = -Math.sin(a) * wid;
  const ny = Math.cos(a) * wid;
  const mx = x + Math.cos(a) * len * 0.45;
  const my = y + Math.sin(a) * len * 0.45;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx + nx, my + ny, tx, ty);
  ctx.quadraticCurveTo(mx - nx, my - ny, x, y);
  ctx.closePath();
}

function paintField(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, k: number): void {
  const W = l.field.w;
  const H = l.field.h;
  // local coordinates: field origin at 0,0
  const at = (wx: number, wy: number): [number, number] => {
    const [x, y] = toScreen(l, wx, wy);
    return [x - l.field.x, y - l.field.y];
  };
  const sc = l.scale;
  const rng = new Rng(20261112);
  const shadow = (blur: number, dx: number, dy: number, a = 0.4) => paperShadow(ctx, k, blur, dx, dy, a);

  // ground: jungle-green batik cloth, printed with flowers, dots and fine wax cracks
  ctx.fillStyle = PAL.jungle;
  ctx.fillRect(0, 0, W, H);
  const step = 30;
  for (let row = 0, y = 0; y < H + step; row++, y += step * 0.75) {
    for (let x = (row % 2) * step * 0.5; x < W + step; x += step) {
      batikFlower(ctx, x, y, 6.5, 'rgba(140,200,160,0.10)');
      ctx.fillStyle = 'rgba(140,200,160,0.12)';
      ctx.beginPath(); ctx.arc(x + step * 0.5, y, 1.1, 0, TAU); ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(215,240,220,0.07)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 120; i++) {
    let x = rng.int(Math.round(W));
    let y = rng.int(Math.round(H));
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += rng.int(41) - 20; y += rng.int(31) - 15; ctx.lineTo(x, y); }
    ctx.stroke();
  }

  // river: a cream bank strip, deep water paper, two lighter water strips with scalloped cut edges
  const [, ry0] = at(0, RIVER.y - RIVER.halfWidth);
  const rh = RIVER.halfWidth * 2 * sc;
  const torn = (y0: number, y1: number, jag: number) => {
    ctx.beginPath();
    ctx.moveTo(-4, y0);
    for (let x = 0; x <= W + 6; x += 5) ctx.lineTo(x, y0 + (rng.int(100) / 100 - 0.5) * jag);
    ctx.lineTo(W + 6, y1);
    for (let x = W + 6; x >= -6; x -= 5) ctx.lineTo(x, y1 + (rng.int(100) / 100 - 0.5) * jag);
    ctx.closePath();
  };
  const scallop = (y0: number, y1: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(-r, y1);
    ctx.lineTo(-r, y0);
    for (let x = -r; x < W + r; x += r * 2) ctx.arc(x + r, y0, r, Math.PI, 0);
    ctx.lineTo(W + r, y1);
    ctx.closePath();
  };
  shadow(4, 0, 2, 0.35);
  ctx.fillStyle = PAL.sand;
  torn(ry0 - 5, ry0 + rh + 5, 2.5);
  ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = '#1f6578';
  ctx.fillRect(0, ry0, W, rh);
  shadow(3, 0, 1.5, 0.35);
  ctx.fillStyle = PAL.river;
  scallop(ry0 + rh * 0.22, ry0 + rh * 0.62, 4);
  ctx.fill();
  ctx.fillStyle = '#3796aa';
  scallop(ry0 + rh * 0.55, ry0 + rh, 3.5);
  ctx.fill();
  noShadow(ctx);
  // batik wave lines (ombak)
  ctx.strokeStyle = 'rgba(232,246,240,0.55)';
  ctx.lineWidth = 0.9;
  for (let row = 0; row < 3; row++) {
    const yy = ry0 + rh * (0.32 + row * 0.22);
    ctx.beginPath();
    for (let x = -10 + (row % 2) * 6; x < W + 10; x += 12) {
      ctx.moveTo(x, yy);
      ctx.arc(x + 3, yy, 3, Math.PI, 0);
    }
    ctx.stroke();
  }

  // trees: cut-paper leaf clusters in two layers, each with a paper shadow
  const trees: [number, number, number, number][] = [];
  for (let i = 0; i < 1400 && trees.length < 150; i++) {
    const wx = 100 + rng.int(3700);
    const wy = FIELD.minY + 100 + rng.int(FIELD.maxY - FIELD.minY - 200);
    if (Math.abs(wy - RIVER.y) < RIVER.halfWidth + 140) continue;
    if (!inJungle(wx, wy, sim.lanes)) continue;
    const near = [...CAMPS, ...DENS, BOSS_PIT, ...WARD_SPOTS, ...SHRINES].some(([cx, cy]) => (cx - wx) ** 2 + (cy - wy) ** 2 < 260 * 260);
    if (near) continue;
    trees.push([wx, wy, 80 + rng.int(90), rng.int(628) / 100]);
  }
  shadow(3, 1.2, 2.2, 0.45);
  for (const [wx, wy, r, rot] of trees) {
    const [x, y] = at(wx, wy);
    const rr = r * sc * 1.15;
    ctx.fillStyle = PAL.canopy;
    for (let i = 0; i < 6; i++) { leaf(ctx, x, y, rot + (i * TAU) / 6, rr, rr * 0.42); ctx.fill(); }
  }
  shadow(2, 0.8, 1.4, 0.35);
  for (const [wx, wy, r, rot] of trees) {
    const [x, y] = at(wx, wy);
    const rr = r * sc * 0.75;
    ctx.fillStyle = PAL.canopyLight;
    for (let i = 0; i < 4; i++) { leaf(ctx, x, y, rot + 0.4 + (i * TAU) / 4, rr, rr * 0.42); ctx.fill(); }
  }
  noShadow(ctx);
  ctx.strokeStyle = 'rgba(232,245,220,0.35)';
  ctx.lineWidth = 0.6;
  for (const [wx, wy, r, rot] of trees) {
    const [x, y] = at(wx, wy);
    const rr = r * sc * 0.75;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { const a = rot + 0.4 + (i * TAU) / 4; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * rr * 0.8, y + Math.sin(a) * rr * 0.8); }
    ctx.stroke();
    ctx.fillStyle = '#e0b04a';
    ctx.beginPath(); ctx.arc(x, y, Math.max(1, rr * 0.12), 0, TAU); ctx.fill();
  }

  // lanes: kraft paper strips with a light torn rim, a paper shadow and a printed border motif
  const lanePath = (id: number) => {
    ctx.beginPath();
    LANES[id].pts.forEach(([wx, wy], i) => { const [x, y] = at(wx, wy); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  };
  const lw = LANE_HALF * 2 * sc;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  shadow(4, 1.5, 2.5, 0.45);
  for (const id of sim.lanes) { lanePath(id); ctx.lineWidth = lw + 3; ctx.strokeStyle = PAL.clayLight; ctx.stroke(); }
  noShadow(ctx);
  for (const id of sim.lanes) { lanePath(id); ctx.lineWidth = lw; ctx.strokeStyle = PAL.clay; ctx.stroke(); }
  ctx.setLineDash([1.5, 5]);
  for (const id of sim.lanes) { lanePath(id); ctx.lineWidth = Math.max(0.8, lw * 0.07); ctx.strokeStyle = 'rgba(110,62,26,0.26)'; ctx.stroke(); }
  ctx.setLineDash([]);
  for (const id of sim.lanes) {
    const lane = LANES[id];
    for (let s = 120, side = 1; s < lane.length; s += 260, side = -side) {
      const [wx, wy] = pointAt(lane, s);
      const [x, y] = at(wx, wy);
      // three printed dots (cecek), small and quiet so they never read as map markers
      ctx.fillStyle = 'rgba(120,70,30,0.3)';
      for (let d = -1; d <= 1; d++) { ctx.beginPath(); ctx.arc(x + side * lw * 0.3 + d * 2.4, y + Math.abs(d) * 1.6, Math.max(0.7, lw * 0.045), 0, TAU); ctx.fill(); }
    }
  }

  // bridges: cream paper planks where lanes cross the river
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, ry0 - 2, W, rh + 4);
  ctx.clip();
  shadow(3, 1, 2, 0.45);
  for (const id of sim.lanes) { lanePath(id); ctx.lineWidth = lw * 0.95; ctx.strokeStyle = PAL.parchment; ctx.stroke(); }
  noShadow(ctx);
  ctx.strokeStyle = 'rgba(123,74,34,0.4)';
  ctx.lineWidth = 0.8;
  for (let y = ry0 + 2; y < ry0 + rh; y += 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();

  // clearings and landmarks, as paper pieces
  const disc = (wx: number, wy: number, r: number, fill: string, stitch: string | null) => {
    const [x, y] = at(wx, wy);
    shadow(3, 1, 2, 0.35);
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.ellipse(x, y, r * sc * 1.15, r * sc, 0, 0, TAU); ctx.fill();
    noShadow(ctx);
    if (stitch) {
      ctx.strokeStyle = stitch;
      ctx.lineWidth = 1;
      ctx.setLineDash([2.5, 2.5]);
      ctx.beginPath(); ctx.ellipse(x, y, r * sc * 1.15 - 3, r * sc - 3, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
  };
  for (const [wx, wy] of CAMPS) disc(wx, wy, 230, 'rgba(234,216,176,0.9)', 'rgba(123,74,34,0.55)');
  for (const [wx, wy] of DENS) {
    disc(wx, wy, 250, 'rgba(74,42,20,0.85)', 'rgba(234,216,176,0.5)');
    const [x, y] = at(wx, wy);
    shadow(2, 1, 1.5, 0.4);
    ctx.fillStyle = PAL.indigoDark;
    ctx.beginPath(); ctx.ellipse(x, y - 4, 160 * sc, 110 * sc, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    noShadow(ctx);
  }
  {
    // Gajah Mina's pool under the middle bridge (or open river when there is no middle lane)
    const [x, y] = at(BOSS_PIT[0], BOSS_PIT[1]);
    shadow(3, 1, 2, 0.4);
    ctx.fillStyle = 'rgba(17,26,47,0.85)';
    ctx.beginPath(); ctx.ellipse(x, y, 260 * sc, 190 * sc, 0, 0, TAU); ctx.fill();
    noShadow(ctx);
    ctx.strokeStyle = 'rgba(232,246,240,0.5)';
    ctx.lineWidth = 0.9;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      for (let xx = x - 200 * sc; xx < x + 200 * sc; xx += 8) { ctx.moveTo(xx, y + i * 6); ctx.arc(xx + 2.5, y + i * 6, 2.5, Math.PI, 0); }
      ctx.stroke();
    }
    ctx.strokeStyle = PAL.paperEdge;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.ellipse(x, y, 260 * sc, 190 * sc, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const [wx, wy] of WARD_SPOTS) {
    const [x, y] = at(wx, wy);
    shadow(2, 0.8, 1.4, 0.4);
    ctx.fillStyle = '#d9cfb8';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 7, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ece4cf';
    ctx.beginPath(); ctx.ellipse(x, y - 2, 4.5, 3, 0, 0, TAU); ctx.fill();
    noShadow(ctx);
  }
  for (const [wx, wy] of SHRINES) {
    const [x, y] = at(wx, wy);
    ctx.strokeStyle = 'rgba(244,234,214,0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }

  // a soft indigo vignette at the board's edges
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(17,26,47,0)');
  v.addColorStop(1, 'rgba(17,26,47,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}
