// Character figures (DEC-013): heroes and troops drawn as small painted board-game standees in the
// Hikayat style (docs/design/art-style.md). Each piece is drawn in code on a grid 100 units tall
// (feet at 0, head near -100), on a team-coloured base, and cached as a bitmap per pose so ~80
// figures a frame stay cheap on a phone. Drawing only; no game rules.
import type { HeroKind, UnitKind } from '../game/rules';
import { PAL, teamColors } from './art';

const INK = PAL.ink;
const TAU = Math.PI * 2;

export interface FigureOpts {
  facing: 1 | -1;
  /** Walk phase 0..1 (loops); drawn as 4 frames. */
  walk: number;
  /** 0 = not attacking; 0..1 = swing progress (wind-up, then strike). */
  attack: number;
  flying?: boolean;
  /** Belang's beast form. */
  transformed?: boolean;
  alpha?: number;
  /** A lane-wave troop: a little smaller, plainer base. */
  wave?: boolean;
}

// ---------------------------------------------------------------------------------------------
// colour helpers

function rgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  const m = (i: number) => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0');
  return `#${m(0)}${m(1)}${m(2)}`;
}
const shade = (c: string, k = 0.28) => mix(c, '#000000', k);
const tint = (c: string, k = 0.3) => mix(c, '#ffffff', k);

// ---------------------------------------------------------------------------------------------
// a tiny pen: filled shapes with an ink outline, thick limbs with an ink rim

class Pen {
  constructor(readonly c: CanvasRenderingContext2D, readonly lw: number) {}

  private end(fill: string | null, stroke: boolean | string): void {
    const c = this.c;
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.lineWidth = this.lw; c.strokeStyle = typeof stroke === 'string' ? stroke : INK; c.stroke(); }
  }
  circle(x: number, y: number, r: number, fill: string | null, stroke: boolean | string = true): void {
    this.c.beginPath(); this.c.arc(x, y, Math.max(0.1, r), 0, TAU); this.end(fill, stroke);
  }
  ell(x: number, y: number, rx: number, ry: number, fill: string | null, stroke: boolean | string = true, rot = 0): void {
    this.c.beginPath(); this.c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); this.end(fill, stroke);
  }
  poly(pts: readonly number[], fill: string | null, stroke: boolean | string = true, close = true): void {
    const c = this.c;
    c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    if (close) c.closePath();
    this.end(fill, stroke);
  }
  shape(fn: (c: CanvasRenderingContext2D) => void, fill: string | null, stroke: boolean | string = true): void {
    this.c.lineJoin = 'round';
    this.c.beginPath(); fn(this.c); this.end(fill, stroke);
  }
  /** A thick rounded stroke (arm, leg, pole) with an ink rim. */
  limb(pts: readonly number[], w: number, color: string, outline = true): void {
    const c = this.c;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    if (outline) { c.strokeStyle = INK; c.lineWidth = w + this.lw * 2; c.stroke(); }
    c.strokeStyle = color; c.lineWidth = w; c.stroke();
  }
  /** Same, along a quadratic curve. */
  bend(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, w: number, color: string, outline = true): void {
    const c = this.c;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2);
    if (outline) { c.strokeStyle = INK; c.lineWidth = w + this.lw * 2; c.stroke(); }
    c.strokeStyle = color; c.lineWidth = w; c.stroke();
  }
  /** A plain stroke with no rim (stripes, strings, details). */
  line(pts: readonly number[], color: string, w: number): void {
    const c = this.c;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.strokeStyle = color; c.lineWidth = w; c.stroke();
  }
  dot(x: number, y: number, r: number, color: string): void {
    this.c.beginPath(); this.c.arc(x, y, Math.max(0.1, r), 0, TAU); this.c.fillStyle = color; this.c.fill();
  }
  rrect(x: number, y: number, w: number, h: number, r: number, fill: string | null, stroke: boolean | string = true): void {
    const c = this.c;
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    this.end(fill, stroke);
  }
  glow(x: number, y: number, r: number, color: string, a: number): void {
    const c = this.c;
    const [cr, cg, cb] = rgb(color);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
    g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
}

// ---------------------------------------------------------------------------------------------
// poses

interface Team { base: string; light: string; dark: string }

interface Pose {
  frame: number; // 0-3 walk, 4 wind-up, 5 strike
  leg: number; // -1..1 leg swing
  bob: number; // body bob, units (negative = up)
  atk: 0 | 1 | 2;
  team: Team;
  transformed: boolean;
}

function frameOf(o: FigureOpts): number {
  if (o.attack > 0) return o.attack < 0.5 ? 4 : 5;
  const w = ((o.walk % 1) + 1) % 1;
  return Math.floor(w * 4) % 4;
}

function poseOf(frame: number, owner: number, transformed: boolean): Pose {
  const leg = [0, 1, 0, -1, -0.4, 0.7][frame];
  const bob = [0, -2.5, 0, -2.5, -1, 1][frame];
  const atk = frame === 4 ? 1 : frame === 5 ? 2 : 0;
  return { frame, leg, bob, atk, team: teamColors(owner), transformed };
}

/** Hand position and held-weapon angle for the front hand (canvas angles: -PI/2 is up). */
function grip(f: Pose, style: 'melee' | 'ranged' | 'hold'): { x: number; y: number; a: number } {
  if (style === 'melee') {
    if (f.atk === 1) return { x: 2, y: -68, a: -2.4 };
    if (f.atk === 2) return { x: 25, y: -44, a: -0.2 };
    return { x: 15, y: -38, a: -1.15 };
  }
  if (style === 'ranged') {
    if (f.atk === 1) return { x: 18, y: -54, a: 0 };
    if (f.atk === 2) return { x: 22, y: -55, a: -0.05 };
    return { x: 15, y: -40, a: -1.2 };
  }
  if (f.atk === 1) return { x: 14, y: -54, a: -1.5 };
  if (f.atk === 2) return { x: 22, y: -56, a: -0.9 };
  return { x: 14, y: -42, a: -1.45 };
}

function eyes(p: Pen, hx: number, hy: number, r: number, color: string = INK): void {
  p.dot(hx + r * 0.16, hy, Math.max(1.6, r * 0.13), color);
  p.dot(hx + r * 0.62, hy, Math.max(1.6, r * 0.13), color);
}

// ---------------------------------------------------------------------------------------------
// the humanoid template

interface Build { hip: number; sh: number; wSh: number; wHip: number; legW: number; armW: number; headY: number; headR: number }

const BUILDS = {
  slim: { hip: -30, sh: -55, wSh: 12, wHip: 10, legW: 7, armW: 6, headY: -74, headR: 17 },
  stocky: { hip: -28, sh: -54, wSh: 17, wHip: 15, legW: 9, armW: 8, headY: -73, headR: 17 },
  robe: { hip: -30, sh: -55, wSh: 12, wHip: 17, legW: 6, armW: 6, headY: -74, headR: 17 },
  belly: { hip: -28, sh: -55, wSh: 14, wHip: 13, legW: 8, armW: 6, headY: -74, headR: 17 },
  giant: { hip: -30, sh: -62, wSh: 23, wHip: 16, legW: 12, armW: 11, headY: -78, headR: 15 },
} satisfies Record<string, Build>;

type BuildName = keyof typeof BUILDS;

interface Hold { x: number; y: number; a: number }

interface Human {
  skin: string;
  top: string;
  bottom: string;
  sleeve?: string;
  build?: BuildName;
  style?: 'melee' | 'ranged' | 'hold';
  sash?: boolean; // team sash across the chest (default true)
  hair?: string;
  /** Replaces the plain round head (face, ears, snout...). */
  head?: (p: Pen, f: Pose, hx: number, hy: number, r: number) => void;
  /** Drawn over the head (hats, hoods). */
  hat?: (p: Pen, f: Pose, hx: number, hy: number, r: number) => void;
  /** Behind everything (cloaks, wings, tails, packs). */
  back?: (p: Pen, f: Pose, b: Build) => void;
  /** The prop in the front hand. */
  front?: (p: Pen, f: Pose, g: Hold, b: Build) => void;
  /** After the front arm (shields that cover the hand). */
  over?: (p: Pen, f: Pose, g: Hold, b: Build) => void;
  /** Replaces the legs (a wave, a coil). */
  legs?: (p: Pen, f: Pose, b: Build) => void;
  /** Extra torso detail (stripes, scales, plates). */
  torso?: (p: Pen, f: Pose, b: Build) => void;
}

function human(p: Pen, f: Pose, h: Human): void {
  const b: Build = BUILDS[h.build ?? 'slim'];
  const c = p.c;
  const sw = f.leg * 7;
  const robe = h.build === 'robe';
  // legs (they stay planted; the body bobs above them)
  if (h.legs) h.legs(p, f, b);
  else if (robe) {
    p.ell(-6 - sw, -3, 6, 3, shade(h.bottom, 0.4));
    p.ell(7 + sw, -3, 6, 3, shade(h.bottom, 0.3));
  } else {
    p.limb([-4, b.hip, -5 - sw, -5], b.legW, shade(h.bottom, 0.22));
    p.ell(-3 - sw, -3.5, b.legW * 0.75, 3, INK, false);
    p.limb([4, b.hip, 5 + sw, -5], b.legW, h.bottom);
    p.ell(7 + sw, -3.5, b.legW * 0.75, 3, INK, false);
  }
  const lunge = f.atk === 2 ? 4 : f.atk === 1 ? -2 : 0;
  c.save();
  c.translate(lunge, f.bob);
  h.back?.(p, f, b);
  // back arm
  const sl = h.sleeve ?? h.top;
  p.limb([-b.wSh + 3, b.sh + 5, -b.wSh - 3 - f.leg * 4, b.sh + 22], b.armW, shade(sl, 0.2));
  // torso
  if (robe) {
    p.shape((x) => {
      x.moveTo(-b.wSh, b.sh + 2);
      x.quadraticCurveTo(0, b.sh - 3, b.wSh, b.sh + 2);
      x.lineTo(b.wHip, -5);
      x.quadraticCurveTo(0, -1, -b.wHip, -5);
      x.closePath();
    }, h.top);
  } else {
    p.shape((x) => {
      x.moveTo(-b.wSh, b.sh + 2);
      x.quadraticCurveTo(0, b.sh - 3, b.wSh, b.sh + 2);
      x.lineTo(b.wHip, b.hip + 3);
      x.quadraticCurveTo(0, b.hip + 6, -b.wHip, b.hip + 3);
      x.closePath();
    }, h.top);
    if (h.build === 'belly') p.ell(5, -42, 15, 13, h.top);
  }
  h.torso?.(p, f, b);
  if (h.sash !== false) {
    // team sash, shoulder to hip
    p.poly([-b.wSh + 1, b.sh + 4, -b.wSh + 8, b.sh + 1, b.wHip + 1, b.hip - 1, b.wHip - 6, b.hip + 3], f.team.base);
  }
  // head
  const hx = 2;
  const hy = b.headY;
  const r = b.headR;
  if (h.head) h.head(p, f, hx, hy, r);
  else {
    if (h.hair) p.circle(hx - 2, hy - 1, r + 1, h.hair);
    p.circle(hx, hy, r, h.skin);
    if (h.hair) p.shape((x) => { x.arc(hx - 1, hy - 1, r + 0.5, Math.PI * 0.95, Math.PI * 1.85); x.quadraticCurveTo(hx + 2, hy - r * 0.35, hx - r * 0.9, hy + r * 0.2); x.closePath(); }, h.hair);
    eyes(p, hx, hy + 1, r);
  }
  h.hat?.(p, f, hx, hy, r);
  // front arm and prop
  const g = grip(f, h.style ?? 'melee');
  h.front?.(p, f, g, b);
  p.limb([b.wSh - 3, b.sh + 5, g.x, g.y], b.armW, sl);
  p.circle(g.x, g.y, b.armW * 0.55, h.skin);
  h.over?.(p, f, g, b);
  c.restore();
}

/** A straight held pole from the hand along angle a: `back` units behind, `fwd` units ahead. */
function pole(g: Hold, back: number, fwd: number): [number, number, number, number] {
  const dx = Math.cos(g.a);
  const dy = Math.sin(g.a);
  return [g.x - dx * back, g.y - dy * back, g.x + dx * fwd, g.y + dy * fwd];
}

// ---------------------------------------------------------------------------------------------
// heroes

interface HeroArt { draw: (p: Pen, f: Pose) => void; headX: number; headY: number; scale: number }

const humanArt = (h: Human, scale = 1): HeroArt => {
  const b = BUILDS[h.build ?? 'slim'];
  return { draw: (p, f) => human(p, f, h), headX: 2, headY: b.headY, scale };
};

function tigerHead(p: Pen, hx: number, hy: number, r: number, fur: string): void {
  p.shape((x) => { x.moveTo(hx - r * 0.85, hy - r * 0.45); x.lineTo(hx - r * 0.55, hy - r * 1.2); x.lineTo(hx - r * 0.15, hy - r * 0.75); x.closePath(); }, fur);
  p.shape((x) => { x.moveTo(hx + r * 0.25, hy - r * 0.75); x.lineTo(hx + r * 0.65, hy - r * 1.2); x.lineTo(hx + r * 0.9, hy - r * 0.4); x.closePath(); }, fur);
  p.circle(hx, hy, r, fur);
  p.ell(hx + r * 0.45, hy + r * 0.42, r * 0.62, r * 0.42, '#fbf3df');
  p.line([hx - r * 0.35, hy - r * 0.95, hx - r * 0.15, hy - r * 0.55], INK, r * 0.14);
  p.line([hx + r * 0.05, hy - r * 1.0, hx + r * 0.1, hy - r * 0.55], INK, r * 0.14);
  p.line([hx - r * 0.95, hy - r * 0.1, hx - r * 0.55, hy - r * 0.05], INK, r * 0.14);
  p.dot(hx + r * 0.95, hy + r * 0.25, r * 0.16, INK);
  p.dot(hx + r * 0.2, hy - r * 0.15, r * 0.14, INK);
  p.dot(hx + r * 0.62, hy - r * 0.15, r * 0.14, INK);
}

function stripes(p: Pen, b: Build): void {
  for (let i = 0; i < 3; i++) {
    const y = b.sh + 8 + i * 7;
    p.line([-b.wSh + 3, y, -b.wSh + 9, y + 3], INK, 2.4);
    p.line([b.wSh - 3, y, b.wSh - 9, y + 3], INK, 2.4);
  }
}

function tigerBeast(p: Pen, f: Pose): void {
  const fur = '#e08a2e';
  const sw = f.leg * 6;
  const lunge = f.atk === 2 ? 6 : f.atk === 1 ? -3 : 0;
  p.c.save();
  p.c.translate(lunge, f.bob * 0.6);
  // tail
  p.bend(-30, -40, -50, -60, -44, -72, 6, fur);
  p.line([-44, -72, -46, -68], INK, 3);
  // far legs
  p.limb([-20, -32, -24 + sw, -4], 9, shade(fur, 0.25));
  p.limb([20, -32, 22 - sw, -4], 9, shade(fur, 0.25));
  // body
  p.ell(0, -40, 34, 16, fur);
  p.ell(4, -32, 22, 7, '#fbf3df', false);
  for (const sx of [-18, -8, 2, 12]) p.line([sx, -55, sx + 3, -44], INK, 3);
  // near legs
  p.limb([-16, -30, -14 - sw, -4], 10, fur);
  p.limb([22, -30, 26 + sw, -4], 10, fur);
  // collar in team colour
  p.limb([24, -56, 30, -34], 6, f.team.base);
  tigerHead(p, 40, -54, 15, fur);
  if (f.atk === 2) for (let i = 0; i < 3; i++) p.line([56, -62 + i * 7, 66, -52 + i * 7], '#ffffff', 2.2);
  p.c.restore();
}

const KAIL_HOOK = '#a7b0b5';

const HEROES_ART: Record<HeroKind, HeroArt> = {
  // Rimba: hooded jungle huntress with a blowpipe
  rimba: humanArt({
    skin: '#c98a5a', top: '#3f7a3a', bottom: '#2e4f2a', style: 'ranged',
    back: (p, _f, b) => p.poly([-b.wSh + 1, b.sh, 4, b.sh - 2, -2, -14, -9, -20, -14, -11, -20, -19, -27, -14, -25, -26, -30, -30, -20, b.sh + 8], '#2f6a2e'),
    head: (p, _f, hx, hy, r) => {
      p.shape((x) => {
        x.moveTo(hx - r * 1.05, hy + r * 0.75);
        x.quadraticCurveTo(hx - r * 1.35, hy - r * 0.9, hx - r * 1.5, hy - r * 1.55);
        x.quadraticCurveTo(hx + r * 0.6, hy - r * 1.55, hx + r * 1.05, hy + r * 0.2);
        x.lineTo(hx + r * 0.55, hy + r * 1.0);
        x.closePath();
      }, '#2f5e2c');
      p.ell(hx + r * 0.38, hy + r * 0.18, r * 0.58, r * 0.62, '#c98a5a');
      eyes(p, hx + r * 0.08, hy + r * 0.1, r * 0.95);
    },
    front: (p, f, g) => {
      if (f.atk) p.limb([g.x - 4, g.y + 1, g.x + 36, g.y - 3], 3.2, '#7a5230');
      else p.limb(pole(g, 10, 30), 3.2, '#7a5230');
    },
  }),

  // Benteng: stocky guardian, battlement helmet, a great round shield
  benteng: humanArt({
    skin: '#b07850', top: '#8a6a3a', bottom: '#5a4632', build: 'stocky', style: 'melee', sash: true,
    hat: (p, _f, hx, hy, r) => {
      p.shape((x) => { x.arc(hx, hy + 1, r + 1.5, Math.PI, 0); x.closePath(); }, '#8b8f94');
      for (const dx of [-r * 0.85, -r * 0.2, r * 0.45]) p.rrect(hx + dx - 3, hy - r - 7, 7, 7, 1, '#8b8f94');
      p.limb([hx - r - 1, hy + 1, hx + r + 1, hy + 1], 3, '#6d7176');
    },
    over: (p, f) => {
      const sx = f.atk === 2 ? 26 : f.atk === 1 ? 18 : 17;
      const sy = f.atk === 1 ? -50 : -40;
      p.circle(sx, sy, 20, '#b8843a');
      p.circle(sx, sy, 14, f.team.base);
      p.circle(sx, sy, 5.5, PAL.gold);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        p.dot(sx + Math.cos(a) * 17, sy + Math.sin(a) * 17, 1.4, '#6b4426');
      }
    },
  }),

  // Kail: fisherman under a wide terendak hat, swinging a big hook on a rope
  kail: humanArt({
    skin: '#c08458', top: '#5d7c8a', bottom: '#3d5560', style: 'melee',
    hat: (p, _f, hx, hy, r) => {
      p.poly([hx - r * 1.95, hy - r * 0.3, hx + r * 1.95, hy - r * 0.3, hx + r * 0.1, hy - r * 1.55], '#d8b46a');
      p.line([hx - r * 1.1, hy - r * 0.55, hx + r * 1.2, hy - r * 0.55], '#a57a24', 1.6);
      p.line([hx + r * 0.1, hy - r * 1.5, hx - r * 0.2, hy - r * 0.35], '#a57a24', 1.2);
    },
    front: (p, f, g) => {
      let hx: number; let hy: number;
      if (f.atk === 1) { hx = g.x - 26; hy = g.y - 22; } else if (f.atk === 2) { hx = g.x + 30; hy = g.y - 4; } else { hx = g.x + 9; hy = -12; }
      p.line([g.x, g.y, (g.x + hx) / 2 + (f.atk ? 0 : 4), (g.y + hy) / 2 + (f.atk ? -6 : 4), hx, hy], '#e2cf9f', 2);
      // hook: a fat J
      p.bend(hx, hy, hx, hy + 12, hx - 9, hy + 9, 4.2, KAIL_HOOK);
      p.limb([hx, hy, hx, hy + 3], 4.2, KAIL_HOOK);
      p.poly([hx - 9, hy + 9, hx - 13, hy + 3, hx - 6, hy + 5], KAIL_HOOK);
    },
  }),

  // Seri: a small glowing girl of the hidden folk, with a floating lantern and a veil
  seri: humanArt({
    skin: '#f0d0b0', top: '#f4ecd0', bottom: '#e2cf9f', build: 'robe', style: 'hold', hair: '#2a1d18',
    back: (p) => {
      p.glow(0, -55, 52, '#ffe9a8', 0.55);
      p.shape((x) => { x.moveTo(-12, -86); x.quadraticCurveTo(-30, -55, -22, -14); x.lineTo(-8, -40); x.closePath(); }, 'rgba(255,255,255,0.6)', 'rgba(29,20,14,0.5)');
    },
    hat: (p, _f, hx, hy, r) => {
      p.shape((x) => { x.arc(hx, hy, r + 2.5, Math.PI * 1.05, Math.PI * 1.9); x.quadraticCurveTo(hx - r * 0.2, hy - r * 0.6, hx - r * 1.1, hy + r * 0.4); x.closePath(); }, 'rgba(255,255,255,0.75)', 'rgba(29,20,14,0.6)');
      p.dot(hx - r * 0.2, hy - r - 2, 2.2, PAL.gold);
    },
    front: (p, f, g) => {
      const lx = g.x + 12;
      const ly = g.y - 16 + (f.frame % 2 ? -2 : 0);
      p.glow(lx, ly, 20, '#ffd76a', 0.8);
      p.line([g.x, g.y, lx, ly - 7], '#a57a24', 1);
      p.rrect(lx - 5, ly - 7, 10, 13, 3, '#f6c74a');
      p.dot(lx, ly, 2.8, '#fff6d0');
    },
  }),

  // Belang: tiger-man; at level 4 a full tiger
  belang: {
    headX: 2, headY: -74, scale: 1.05,
    draw: (p, f) => {
      if (f.transformed) { tigerBeast(p, f); return; }
      human(p, f, {
        skin: '#e08a2e', top: '#e08a2e', bottom: '#5a3a22', build: 'stocky', style: 'melee', sash: true,
        torso: (q, _f, b) => stripes(q, b),
        back: (q) => q.bend(-12, -32, -30, -32, -30, -54, 5, '#e08a2e'),
        head: (q, _f, hx, hy, r) => tigerHead(q, hx, hy, r, '#e08a2e'),
        front: (q, ff, g) => {
          for (let i = 0; i < 3; i++) q.line([g.x + 2, g.y - 3 + i * 3, g.x + 8, g.y - 5 + i * 3.5], '#fbf3df', 1.8);
          if (ff.atk === 2) for (let i = 0; i < 3; i++) q.line([g.x + 12, g.y - 14 + i * 7, g.x + 20, g.y - 4 + i * 7], '#ffffff', 2);
        },
      });
    },
  },

  // Gergasi: a huge tusked giant with a log club
  gergasi: humanArt({
    skin: '#8a5a3a', top: '#8a5a3a', bottom: '#5a3e22', build: 'giant', style: 'melee', sash: true, sleeve: '#8a5a3a',
    torso: (p, _f, b) => {
      p.shape((x) => { x.moveTo(-b.wHip, b.hip + 2); x.lineTo(b.wHip, b.hip + 2); x.lineTo(b.wHip - 2, b.hip + 14); x.lineTo(-b.wHip + 2, b.hip + 14); x.closePath(); }, '#5a3e22');
      p.line([-b.wSh + 6, b.sh + 12, -4, b.sh + 16], shade('#8a5a3a', 0.35), 2);
      p.line([b.wSh - 6, b.sh + 12, 4, b.sh + 16], shade('#8a5a3a', 0.35), 2);
    },
    head: (p, _f, hx, hy, r) => {
      p.poly([hx - r * 1.1, hy - r * 0.2, hx - r * 0.9, hy - r * 1.35, hx - r * 0.35, hy - r * 0.95, hx + r * 0.05, hy - r * 1.45, hx + r * 0.4, hy - r * 0.95, hx + r * 0.95, hy - r * 1.2, hx + r * 0.9, hy - r * 0.2], '#3a2618');
      p.circle(hx, hy, r, '#8a5a3a');
      p.line([hx - r * 0.1, hy - r * 0.3, hx + r * 0.8, hy - r * 0.35], INK, 2.2);
      eyes(p, hx, hy - r * 0.05, r);
      p.poly([hx + r * 0.25, hy + r * 0.55, hx + r * 0.38, hy + r * 0.05, hx + r * 0.5, hy + r * 0.55], '#fbf3df');
      p.poly([hx + r * 0.7, hy + r * 0.55, hx + r * 0.83, hy + r * 0.05, hx + r * 0.95, hy + r * 0.55], '#fbf3df');
    },
    front: (p, f, g) => {
      const [x1, y1, x2, y2] = f.atk === 0 ? [g.x, g.y, g.x - 30, -102] : pole(g, 4, 46);
      p.limb([x1, y1, x2, y2], 11, '#7a5230');
      p.line([(x1 * 2 + x2) / 3 - 3, (y1 * 2 + y2) / 3, (x1 * 2 + x2) / 3 + 3, (y1 * 2 + y2) / 3 + 2], INK, 1.6);
      p.circle(x2, y2, 7, '#7a5230');
    },
  }, 1.25),

  // Dalang: a dark-robed puppeteer raising a wayang kulit puppet
  dalang: humanArt({
    skin: '#b07850', top: '#3a2a3e', bottom: '#2a1d28', build: 'robe', style: 'hold',
    hat: (p, _f, hx, hy, r) => {
      p.shape((x) => { x.arc(hx, hy, r + 1, Math.PI * 1.02, Math.PI * 1.98); x.lineTo(hx + r * 1.1, hy - r * 0.15); x.lineTo(hx - r * 1.1, hy - r * 0.15); x.closePath(); }, '#2a1d28');
      p.poly([hx - r * 0.95, hy - r * 0.6, hx - r * 1.55, hy - r * 0.25, hx - r * 1.0, hy - r * 0.05], '#2a1d28');
      p.line([hx - r * 0.95, hy - r * 0.25, hx + r * 1.0, hy - r * 0.25], PAL.gold, 1.6);
    },
    front: (p, f, g) => {
      const tx = g.x + (f.atk === 2 ? 18 : 8);
      const ty = g.y - 44;
      p.line([g.x, g.y + 4, tx, ty + 34], '#5a3e22', 2);
      // the puppet: tall flat profile, crowned, long nose, thin rod arm
      const pc = '#c08a3a';
      p.shape((x) => {
        x.moveTo(tx - 2, ty - 18); x.lineTo(tx + 3, ty - 26); x.lineTo(tx + 6, ty - 17);
        x.quadraticCurveTo(tx + 12, ty - 14, tx + 13, ty - 10); x.lineTo(tx + 6, ty - 9);
        x.lineTo(tx + 8, ty + 10); x.lineTo(tx + 10, ty + 30); x.lineTo(tx - 8, ty + 30);
        x.lineTo(tx - 6, ty + 6); x.lineTo(tx - 4, ty - 10); x.closePath();
      }, pc);
      p.dot(tx + 2, ty + 6, 1.5, INK); p.dot(tx - 2, ty + 14, 1.5, INK); p.dot(tx + 2, ty + 22, 1.5, INK);
      p.dot(tx + 5, ty - 13, 1.4, INK);
      p.line([tx + 6, ty - 2, tx + 18, ty + 8], INK, 1.4);
      p.line([g.x + 2, g.y, tx + 18, ty + 8], '#5a3e22', 1.2);
    },
  }),

  // Senja: dusk serpent mage, crescent-moon hat, serpent staff
  senja: humanArt({
    skin: '#c89070', top: '#6a3f8c', bottom: '#4a2a63', build: 'robe', style: 'hold',
    torso: (p, _f, b) => {
      p.line([-b.wHip + 2, -10, b.wHip - 2, -10], '#e8873a', 3);
      p.line([0, b.sh + 4, 0, -8], '#e8873a', 2);
    },
    hat: (p, _f, hx, hy, r) => {
      p.poly([hx - r * 1.25, hy - r * 0.35, hx + r * 1.25, hy - r * 0.35, hx - r * 0.55, hy - r * 2.0], '#6a3f8c');
      p.line([hx - r * 1.1, hy - r * 0.45, hx + r * 1.1, hy - r * 0.45], '#e8873a', 2.6);
      p.shape((x) => { x.arc(hx + r * 0.05, hy - r * 0.95, r * 0.42, Math.PI * 0.35, Math.PI * 1.65); x.arc(hx + r * 0.22, hy - r * 0.95, r * 0.32, Math.PI * 1.5, Math.PI * 0.5, true); x.closePath(); }, PAL.gold);
    },
    front: (p, f, g) => {
      const [x1, y1, x2, y2] = pole(g, 34, 38);
      p.limb([x1, y1, x2, y2], 3.5, '#5a3e22');
      // serpent head coiled on top
      p.bend(x2, y2 + 6, x2 + 9, y2, x2 + 4, y2 - 8, 4.5, '#5e8a3a');
      p.ell(x2 + 7, y2 - 10, 5, 3.6, '#5e8a3a');
      if (f.atk) p.glow(x2 + 10, y2 - 10, 14, '#e8873a', 0.9);
    },
  }),

  // Hujan: rain caller under an oil-paper umbrella
  hujan: humanArt({
    skin: '#c08458', top: '#3d7fc0', bottom: '#2a5a8a', build: 'robe', style: 'hold', hair: '#1d140e',
    torso: (p, _f, b) => p.line([-b.wHip + 3, -12, b.wHip - 3, -12], '#9cc8ec', 3),
    front: (p, f, g) => {
      const tilt = f.atk === 2 ? 14 : f.atk === 1 ? 6 : 0;
      const tx = g.x - 8 + tilt;
      const ty = -110;
      p.line([g.x, g.y + 4, tx, ty + 4], '#5a3e22', 2.4);
      p.shape((x) => { x.moveTo(tx - 34, ty + 10); x.quadraticCurveTo(tx - 28, ty - 12, tx, ty - 14); x.quadraticCurveTo(tx + 28, ty - 12, tx + 34, ty + 10); x.quadraticCurveTo(tx, ty + 3, tx - 34, ty + 10); }, '#e8c45a');
      for (const dx of [-20, 0, 20]) p.line([tx, ty - 13, tx + dx, ty + 6], '#a57a24', 1.2);
      p.circle(tx, ty - 15, 2.2, PAL.gold);
      const drop = (dx: number, dy: number) => p.shape((x) => { x.moveTo(dx, dy - 4); x.quadraticCurveTo(dx + 3.5, dy + 1, dx, dy + 2.5); x.quadraticCurveTo(dx - 3.5, dy + 1, dx, dy - 4); }, '#7ec3ef');
      const fall = (f.frame % 2) * 4;
      drop(tx - 34, ty + 18 + fall); drop(tx + 34, ty + 22 - fall); drop(tx + 26, ty + 34 + fall);
    },
  }),

  // Layang: rides a wau bulan moon kite (always flying)
  layang: {
    headX: 4, headY: -84, scale: 1,
    draw: (p, f) => {
      const c = p.c;
      c.save();
      c.translate(0, f.bob * 0.8 + (f.atk === 2 ? 6 : 0));
      if (f.atk === 2) c.rotate(0.18);
      const cream = '#f3e6c4';
      // ribbon tails in team colour
      p.bend(-6, -36, -18, -18 + f.leg * 4, -30, -10, 3, f.team.base);
      p.bend(2, -36, -4, -16 - f.leg * 4, -12, -4, 3, f.team.base);
      // crescent tail
      p.shape((x) => { x.moveTo(-34, -48); x.quadraticCurveTo(0, -20, 34, -48); x.quadraticCurveTo(0, -34, -34, -48); }, cream);
      // wings
      p.shape((x) => { x.moveTo(0, -72); x.quadraticCurveTo(-44, -80, -46, -60); x.quadraticCurveTo(-24, -58, 0, -52); x.quadraticCurveTo(24, -58, 46, -60); x.quadraticCurveTo(44, -80, 0, -72); }, cream);
      p.line([-38, -64, -10, -64], '#2a8496', 2.4);
      p.line([10, -64, 38, -64], '#2a8496', 2.4);
      p.dot(-22, -69, 2.6, PAL.gold); p.dot(22, -69, 2.6, PAL.gold);
      // spine
      p.limb([0, -96, 0, -38], 3, '#93643b');
      // rider lying on top
      p.limb([-14, -76, 12, -82], 9, '#5a6fa8');
      p.limb([-16, -74, -26, -70], 6, '#3f2717');
      p.limb([-4, -80, -2 - f.leg * 3, -90], 5, f.team.base); // scarf flying
      p.circle(4 + 10, -86, 11, '#c08458');
      p.shape((x) => { x.arc(14, -86, 11.5, Math.PI * 1.0, Math.PI * 1.9); x.closePath(); }, '#3f2717');
      eyes(p, 14, -84, 10);
      c.restore();
    },
  },

  // Pendekar: silat master in a tanjak headcloth, songket sarong and keris
  pendekar: humanArt({
    skin: '#b8794c', top: '#1f1a1a', bottom: '#1f1a1a', style: 'melee', sash: true,
    torso: (p, _f, b) => {
      p.shape((x) => { x.moveTo(-b.wHip - 1, b.hip - 2); x.lineTo(b.wHip + 1, b.hip - 2); x.lineTo(b.wHip + 4, b.hip + 14); x.lineTo(-b.wHip - 4, b.hip + 14); x.closePath(); }, '#7a1f2a');
      p.line([-b.wHip, b.hip + 6, -b.wHip + 5, b.hip + 2, -b.wHip + 10, b.hip + 6, -b.wHip + 15, b.hip + 2, -b.wHip + 20, b.hip + 6], PAL.gold, 1.4);
    },
    hat: (p, _f, hx, hy, r) => {
      p.shape((x) => { x.moveTo(hx - r * 1.05, hy - r * 0.1); x.quadraticCurveTo(hx - r * 0.9, hy - r * 1.1, hx + r * 0.2, hy - r * 1.05); x.lineTo(hx + r * 1.05, hy - r * 0.25); x.closePath(); }, '#7a1f2a');
      p.poly([hx - r * 0.7, hy - r * 0.9, hx - r * 1.2, hy - r * 1.9, hx - r * 0.05, hy - r * 1.0], '#7a1f2a');
      p.line([hx - r * 0.95, hy - r * 0.35, hx + r * 0.95, hy - r * 0.35], PAL.gold, 1.6);
    },
    front: (p, _f, g) => {
      const dx = Math.cos(g.a);
      const dy = Math.sin(g.a);
      const nx = -dy;
      const ny = dx;
      const pts: number[] = [];
      for (let i = 0; i <= 6; i++) {
        const t = 3 + i * 4;
        const wob = i === 6 ? 0 : (i % 2 ? 1.6 : -1.6);
        pts.push(g.x + dx * t + nx * wob, g.y + dy * t + ny * wob);
      }
      p.limb(pts, 2.6, '#d8dde0');
      p.limb([g.x - dx * 4, g.y - dy * 4, g.x + dx * 3, g.y + dy * 3], 3.5, PAL.gold);
    },
  }),

  // Pelanduk: the clever mousedeer, small, big ears, a vest in team colour
  pelanduk: humanArt({
    skin: '#b07a45', top: '#b07a45', bottom: '#8a5a32', style: 'melee', sash: false,
    torso: (p, f, b) => {
      p.ell(4, b.sh + 14, 6, 9, '#fbf3df', false);
      p.shape((x) => { x.moveTo(-b.wSh, b.sh + 3); x.lineTo(-2, b.sh + 2); x.lineTo(-4, b.hip + 1); x.lineTo(-b.wHip, b.hip + 2); x.closePath(); }, f.team.base);
      p.shape((x) => { x.moveTo(b.wSh, b.sh + 3); x.lineTo(9, b.sh + 2); x.lineTo(8, b.hip + 1); x.lineTo(b.wHip, b.hip + 2); x.closePath(); }, f.team.base);
    },
    back: (p) => p.ell(-13, -32, 5, 4, '#fbf3df'),
    head: (p, _f, hx, hy, r) => {
      p.ell(hx - r * 0.55, hy - r * 1.05, r * 0.32, r * 0.75, '#b07a45', true, -0.35);
      p.ell(hx - r * 0.55, hy - r * 1.0, r * 0.15, r * 0.5, '#e9b8a0', false, -0.35);
      p.ell(hx + r * 0.1, hy - r * 1.1, r * 0.3, r * 0.72, '#b07a45', true, 0.15);
      p.circle(hx, hy, r * 0.82, '#b07a45');
      p.ell(hx + r * 0.75, hy + r * 0.3, r * 0.55, r * 0.38, '#c99060');
      p.dot(hx + r * 1.22, hy + r * 0.22, r * 0.13, INK);
      p.dot(hx + r * 0.25, hy - r * 0.08, r * 0.17, INK);
      p.dot(hx + r * 0.3, hy - r * 0.14, r * 0.06, '#ffffff');
    },
  }, 0.8),

  // Saudagar: spice trader with a songkok, a round belly and a sack
  saudagar: humanArt({
    skin: '#c08458', top: '#d9a63a', bottom: '#5a3e22', build: 'belly', style: 'hold',
    back: (p) => {
      p.ell(-16, -50, 12, 15, '#b8955a');
      p.line([-22, -62, -12, -64], '#7a5230', 2);
    },
    hat: (p, _f, hx, hy, r) => {
      p.rrect(hx - r * 0.8, hy - r * 1.32, r * 1.6, r * 0.75, 2, '#1d140e');
      p.line([hx - r * 0.78, hy - r * 0.72, hx + r * 0.78, hy - r * 0.72], PAL.gold, 1.4);
    },
    head: (p, _f, hx, hy, r) => {
      p.circle(hx, hy, r, '#c08458');
      eyes(p, hx, hy - 1, r);
      p.shape((x) => { x.moveTo(hx + r * 0.1, hy + r * 0.38); x.quadraticCurveTo(hx + r * 0.45, hy + r * 0.2, hx + r * 0.85, hy + r * 0.38); x.quadraticCurveTo(hx + r * 0.45, hy + r * 0.5, hx + r * 0.1, hy + r * 0.38); }, '#1d140e', false);
    },
    front: (p, f, g) => {
      p.ell(g.x + 4, g.y + 6, 7, 8, '#7a3f8c');
      p.line([g.x, g.y, g.x + 8, g.y], PAL.gold, 1.6);
      if (f.atk) { p.circle(g.x + 14, g.y - 10, 3, PAL.gold); p.circle(g.x + 22, g.y - 4, 3, PAL.gold); }
    },
  }),

  // Badak: rhino warrior, heavy, one big horn
  badak: humanArt({
    skin: '#8c8a86', top: '#6a5a48', bottom: '#4a4038', build: 'stocky', style: 'melee', sleeve: '#8c8a86',
    torso: (p, _f, b) => {
      p.line([-b.wSh + 4, b.sh + 10, b.wSh - 4, b.sh + 10], '#4a4038', 2);
      p.line([-b.wSh + 4, b.sh + 18, b.wSh - 4, b.sh + 18], '#4a4038', 2);
    },
    head: (p, f, hx, hy, r) => {
      const dip = f.atk === 2 ? 4 : 0;
      p.ell(hx - r * 0.55, hy - r * 0.85, r * 0.28, r * 0.42, '#8c8a86');
      p.ell(hx + r * 0.25, hy + dip, r * 1.25, r * 0.92, '#8c8a86');
      p.poly([hx + r * 0.9, hy - r * 0.35 + dip, hx + r * 1.15, hy - r * 1.55 + dip, hx + r * 1.45, hy - r * 0.2 + dip], '#e8dcc0');
      p.poly([hx + r * 0.45, hy - r * 0.6 + dip, hx + r * 0.6, hy - r * 1.05 + dip, hx + r * 0.78, hy - r * 0.5 + dip], '#e8dcc0');
      p.dot(hx + r * 0.05, hy - r * 0.15 + dip, r * 0.14, INK);
      p.line([hx + r * 0.9, hy + r * 0.45 + dip, hx + r * 1.3, hy + r * 0.38 + dip], INK, 1.4);
    },
    front: (p, _f, g) => p.circle(g.x + 2, g.y, 5.5, '#8c8a86'),
  }, 1.15),

  // Tedung: king cobra rising from its coil, hood spread
  tedung: {
    headX: 9, headY: -82, scale: 1,
    draw: (p, f) => {
      const green = '#6b7a2e';
      const belly = '#c8c07a';
      const lean = f.atk === 2 ? 14 : f.atk === 1 ? -5 : f.leg * 2;
      p.ell(0, -8, 24, 8, shade(green, 0.15));
      p.ell(-2, -16, 18, 7, green);
      p.bend(-8, -16, 10 + lean * 0.3, -36, 2 + lean * 0.6, -62, 13, green);
      p.bend(-4, -18, 13 + lean * 0.3, -36, 6 + lean * 0.6, -60, 4, belly, false);
      // hood
      const hx = 4 + lean;
      p.ell(hx, -72, 19, 23, green);
      p.ell(hx, -72, 13, 17, shade(green, 0.18), false);
      p.circle(hx - 7, -70, 3.2, belly, false); p.circle(hx + 7, -70, 3.2, belly, false);
      // collar in team colour
      p.limb([hx - 12, -54, hx + 12, -54], 5, f.team.base);
      // head
      p.ell(hx + 5, -84, 10, 8, green);
      p.dot(hx + 8, -86, 1.8, '#f0d040');
      if (f.atk === 2) {
        p.poly([hx + 12, -80, hx + 14, -73, hx + 16, -80], '#ffffff');
        p.line([hx + 15, -82, hx + 22, -80, hx + 25, -84], '#c0392b', 1.4);
      } else p.line([hx + 14, -83, hx + 19, -82, hx + 21, -85], '#a83a2a', 1.2);
    },
  },

  // Tukang: carpenter with a bamboo pole across the shoulders and a mallet
  tukang: humanArt({
    skin: '#b8794c', top: '#8a6a48', bottom: '#3a4a5a', style: 'melee', hair: '#1d140e',
    back: (p) => {
      p.limb([-34, -68, 26, -60], 6, '#7aa83a');
      for (const x of [-22, -8, 8, 20]) p.line([x, -68 + (x + 34) * 0.13, x, -62 + (x + 34) * 0.13], '#4f7a23', 1.4);
    },
    hat: (p, _f, hx, hy, r) => {
      p.shape((x) => { x.arc(hx, hy, r + 0.5, Math.PI * 1.05, Math.PI * 1.95); x.closePath(); }, PAL.clay);
      p.poly([hx - r * 0.9, hy - r * 0.6, hx - r * 1.45, hy - r * 0.9, hx - r * 1.3, hy - r * 0.3], PAL.clay);
    },
    front: (p, _f, g) => {
      const [, , x2, y2] = pole(g, 0, 16);
      p.limb([g.x, g.y, x2, y2], 3, '#93643b');
      const dx = Math.cos(g.a);
      const dy = Math.sin(g.a);
      p.c.save(); p.c.translate(x2, y2); p.c.rotate(Math.atan2(dy, dx));
      p.rrect(-2, -8, 10, 16, 2, '#a8653d');
      p.c.restore();
    },
  }),

  // Helang: sea-eagle archer, feather cloak, white head and hooked beak
  helang: humanArt({
    skin: '#f4f0e8', top: '#7a5230', bottom: '#4a3420', style: 'ranged', sleeve: '#7a5230',
    back: (p, f) => {
      const up = f.frame % 2 ? -4 : 0;
      p.shape((x) => { x.moveTo(-4, -58); x.quadraticCurveTo(-36, -70 + up, -40, -40 + up); x.lineTo(-32, -38 + up); x.lineTo(-30, -30 + up); x.lineTo(-22, -32); x.lineTo(-16, -24); x.quadraticCurveTo(-10, -40, -4, -40); x.closePath(); }, '#6b4426');
      p.line([-34, -46 + up, -22, -36], '#f4f0e8', 2);
    },
    head: (p, _f, hx, hy, r) => {
      p.circle(hx, hy, r, '#f4f0e8');
      p.shape((x) => { x.moveTo(hx + r * 0.6, hy - r * 0.35); x.quadraticCurveTo(hx + r * 1.6, hy - r * 0.45, hx + r * 1.45, hy + r * 0.45); x.quadraticCurveTo(hx + r * 1.2, hy + r * 0.05, hx + r * 0.65, hy + r * 0.25); x.closePath(); }, '#e8b030');
      p.dot(hx + r * 0.38, hy - r * 0.2, r * 0.16, INK);
      p.line([hx + r * 0.15, hy - r * 0.45, hx + r * 0.6, hy - r * 0.38], INK, 1.6);
    },
    front: (p, f, g) => {
      const bx = g.x + 4;
      p.shape((x) => { x.arc(bx - 10, g.y, 22, -0.95, 0.95); }, null, false);
      p.c.lineWidth = 3.2; p.c.strokeStyle = INK; p.c.stroke();
      p.c.lineWidth = 2; p.c.strokeStyle = '#93643b'; p.c.stroke();
      const sx = f.atk === 1 ? bx - 10 : bx - 10 + 22 * Math.cos(0.95);
      p.line([bx - 10 + 22 * Math.cos(0.95), g.y - 22 * Math.sin(0.95), sx, g.y, bx - 10 + 22 * Math.cos(0.95), g.y + 22 * Math.sin(0.95)], '#fbf3df', 1);
      if (f.atk === 1) p.line([sx, g.y, bx + 18, g.y], '#5a3e22', 1.6);
      if (f.atk === 2) p.line([bx + 20, g.y, bx + 40, g.y], '#fbf3df', 1.8);
    },
  }),

  // Embun: mist weaver in pale robes, frost crown, floating snowflake
  embun: humanArt({
    skin: '#ece4e4', top: '#cfe6f0', bottom: '#9cc0d8', build: 'robe', style: 'hold', hair: '#f4f8fb',
    back: (p, f) => {
      const s = f.frame % 2 ? 2 : -2;
      p.c.globalAlpha = 0.65;
      p.ell(-16 + s, -8, 16, 6, '#ffffff', false);
      p.ell(16 - s, -6, 14, 5, '#ffffff', false);
      p.c.globalAlpha = 1;
    },
    torso: (p, _f, b) => {
      p.shape((x) => { x.moveTo(-b.wHip, -5); x.quadraticCurveTo(-b.wHip + 4, -12, -b.wHip + 8, -5); x.quadraticCurveTo(-2, -12, 3, -5); x.quadraticCurveTo(8, -12, b.wHip, -5); }, null, '#7aa6c4');
    },
    hat: (p, _f, hx, hy, r) => {
      for (const [dx, h] of [[-r * 0.6, 9], [0, 13], [r * 0.6, 9]] as const) p.poly([hx + dx - 3, hy - r + 2, hx + dx, hy - r - h, hx + dx + 3, hy - r + 2], '#bfe8f4');
    },
    front: (p, f, g) => {
      const sx = g.x + 10;
      const sy = g.y - 14 + (f.frame % 2 ? -2 : 0);
      p.glow(sx, sy, 16, '#bfe8f4', 0.9);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI + (f.atk ? 0.3 : 0);
        p.limb([sx - Math.cos(a) * 8, sy - Math.sin(a) * 8, sx + Math.cos(a) * 8, sy + Math.sin(a) * 8], 2, '#e8f8ff');
      }
    },
  }),

  // Ombak: rides a curling wave, trident in hand
  ombak: humanArt({
    skin: '#b07850', top: '#2f9a8a', bottom: '#2f9a8a', style: 'melee', hair: '#1d140e',
    legs: (p, f) => {
      const s = f.leg * 3;
      p.shape((x) => {
        x.moveTo(-32, -2); x.quadraticCurveTo(-34, -30, -14, -40 + s); x.quadraticCurveTo(-30, -40, -26, -26);
        x.quadraticCurveTo(-10, -22, 4, -30); x.quadraticCurveTo(18, -26, 30, -4); x.closePath();
      }, PAL.river);
      p.shape((x) => { x.moveTo(-14, -40 + s); x.quadraticCurveTo(-24, -42, -27, -30); x.quadraticCurveTo(-22, -34, -16, -34); x.closePath(); }, '#e8f6f8');
      p.line([-22, -14, -8, -18, 6, -14, 18, -18], '#6cc4c9', 2);
    },
    hat: (p, f, hx, hy, r) => p.limb([hx - r, hy - r * 0.5, hx + r * 0.9, hy - r * 0.55], 3.5, f.team.base),
    front: (p, _f, g) => {
      const [x1, y1, x2, y2] = pole(g, 24, 30);
      p.limb([x1, y1, x2, y2], 3, PAL.goldDark);
      const dx = Math.cos(g.a);
      const dy = Math.sin(g.a);
      const nx = -dy;
      const ny = dx;
      for (const o of [-5, 0, 5]) p.limb([x2 + nx * o, y2 + ny * o, x2 + nx * o + dx * 9, y2 + ny * o + dy * 9], 2, PAL.gold);
      p.limb([x2 + nx * 6, y2 + ny * 6, x2 - nx * 6, y2 - ny * 6], 2, PAL.gold);
    },
  }),

  // Buaya: crocodile bruiser, long toothy snout, tail
  buaya: humanArt({
    skin: '#4f7a3a', top: '#4f7a3a', bottom: '#3a5a2a', build: 'stocky', style: 'melee', sleeve: '#4f7a3a',
    back: (p) => p.shape((x) => { x.moveTo(-10, -36); x.quadraticCurveTo(-34, -28, -44, -4); x.quadraticCurveTo(-26, -18, -6, -24); x.closePath(); }, '#4f7a3a'),
    torso: (p, _f, b) => {
      p.ell(3, b.sh + 18, 9, 12, '#a8b860', false);
      for (const y of [b.sh + 12, b.sh + 18, b.sh + 24]) p.line([-3, y, 9, y], '#7a8a40', 1.3);
    },
    head: (p, f, hx, hy, r) => {
      const open = f.atk === 2 ? 4 : 0;
      p.circle(hx - 2, hy, r * 0.9, '#4f7a3a');
      p.rrect(hx, hy - r * 0.35 - open * 0.5, r * 1.75, r * 0.62, r * 0.25, '#4f7a3a');
      p.rrect(hx, hy + r * 0.2 + open * 0.5, r * 1.6, r * 0.45, r * 0.2, '#6b8f45');
      p.line([hx + 3, hy + r * 0.25, hx + 6, hy + r * 0.12, hx + 9, hy + r * 0.25, hx + 12, hy + r * 0.12, hx + 15, hy + r * 0.25, hx + 18, hy + r * 0.12, hx + 21, hy + r * 0.25], '#fbf3df', 1.4);
      p.circle(hx + r * 0.1, hy - r * 0.62, r * 0.28, '#4f7a3a');
      p.dot(hx + r * 0.15, hy - r * 0.66, r * 0.14, '#f0d040');
      p.dot(hx + r * 0.18, hy - r * 0.66, r * 0.06, INK);
    },
    front: (p, _f, g) => {
      for (let i = 0; i < 3; i++) p.line([g.x + 2, g.y - 3 + i * 3, g.x + 7, g.y - 4 + i * 3.5], '#fbf3df', 1.6);
    },
  }, 1.15),
};

// ---------------------------------------------------------------------------------------------
// troops

interface TroopArt { draw: (p: Pen, f: Pose) => void; scale: number; wide?: boolean }

/** Simple four legs, far pair darker. */
function quadLegs(p: Pen, f: Pose, xs: readonly [number, number, number, number], hip: number, w: number, color: string): void {
  const sw = f.leg * 5;
  p.limb([xs[0], hip, xs[0] - sw, -4], w, shade(color, 0.25));
  p.limb([xs[2], hip, xs[2] + sw, -4], w, shade(color, 0.25));
  p.limb([xs[1], hip, xs[1] + sw, -4], w, color);
  p.limb([xs[3], hip, xs[3] - sw, -4], w, color);
}

function lunge(f: Pose, n = 5): number {
  return f.atk === 2 ? n : f.atk === 1 ? -n * 0.5 : 0;
}

function insect(p: Pen, f: Pose, body: string, opts: { big?: boolean; crown?: boolean; horn?: boolean; wings?: boolean; dark?: string }): void {
  const s = opts.big ? 1.55 : 1.35;
  const lg = f.leg * 4;
  const dk = opts.dark ?? INK;
  p.c.save();
  p.c.translate(lunge(f, 4), f.bob * 0.5);
  // legs
  for (const [x, d] of [[-8, -1], [2, 1], [12, -1]] as const) {
    p.line([x * s, -22 * s, (x - 8 + lg * d) * s, -4], dk, 2.4);
    p.line([x * s, -22 * s, (x + 6 - lg * d) * s, -4], dk, 2.4);
  }
  // abdomen, thorax, head
  p.ell(-18 * s, -28 * s, 17 * s, 13 * s, body);
  p.line([-26 * s, -36 * s, -24 * s, -18 * s], f.team.base, 4.5 * s);
  p.ell(2 * s, -28 * s, 8 * s, 7 * s, body);
  p.circle(16 * s, -32 * s, 9 * s, body);
  p.dot(19 * s, -34 * s, 2.2 * s, INK);
  p.line([20 * s, -40 * s, 26 * s, -52 * s, 32 * s, -50 * s], dk, 1.8);
  p.line([16 * s, -40 * s, 18 * s, -54 * s, 24 * s, -56 * s], dk, 1.8);
  p.line([24 * s, -28 * s, 30 * s, -24 * s], dk, 2);
  if (opts.crown) p.poly([10 * s, -40 * s, 11 * s, -48 * s, 14 * s, -43 * s, 17 * s, -50 * s, 20 * s, -43 * s, 23 * s, -48 * s, 22 * s, -39 * s], PAL.gold);
  p.c.restore();
}

const TROOPS_ART: Record<UnitKind, TroopArt> = {
  spearman: { scale: 1, draw: (p, f) => human(p, f, {
    skin: '#b8794c', top: '#6b4426', bottom: '#3f2717', style: 'melee', sash: false,
    hat: (q, ff, hx, hy, r) => { q.shape((x) => { x.arc(hx, hy, r + 1, Math.PI * 1.02, Math.PI * 1.98); x.closePath(); }, ff.team.base); q.poly([hx - r * 0.9, hy - r * 0.5, hx - r * 1.5, hy - r * 0.2, hx - r * 1.0, hy], ff.team.base); },
    front: (q, _f, g) => { const [x1, y1, x2, y2] = pole(g, 26, 40); q.limb([x1, y1, x2, y2], 3.2, '#93643b'); const dx = Math.cos(g.a); const dy = Math.sin(g.a); q.poly([x2 - dy * 4, y2 + dx * 4, x2 + dx * 12, y2 + dy * 12, x2 + dy * 4, y2 - dx * 4], '#d8dde0'); },
  }) },
  archer: { scale: 1, draw: (p, f) => human(p, f, {
    skin: '#c08458', top: '#4a6a3a', bottom: '#2e4f2a', style: 'ranged', sash: false,
    hat: (q, ff, hx, hy, r) => q.limb([hx - r, hy - r * 0.45, hx + r * 0.9, hy - r * 0.5], 5, ff.team.base),
    hair: '#1d140e',
    torso: (q, ff, b) => q.poly([-b.wSh + 1, b.sh + 4, -b.wSh + 8, b.sh + 1, b.wHip + 1, b.hip - 1, b.wHip - 6, b.hip + 3], ff.team.base),
    front: (q, ff, g) => {
      q.shape((x) => { x.arc(g.x - 8, g.y, 20, -1.0, 1.0); }, null, false);
      q.c.lineWidth = 4; q.c.strokeStyle = INK; q.c.stroke(); q.c.lineWidth = 2.6; q.c.strokeStyle = '#93643b'; q.c.stroke();
      if (ff.atk === 2) q.line([g.x + 14, g.y, g.x + 34, g.y], '#fbf3df', 2);
    },
  }) },
  shieldbearer: { scale: 1.1, draw: (p, f) => human(p, f, {
    skin: '#b07850', top: '#6b5a3a', bottom: '#3f2717', build: 'stocky', style: 'melee', sash: false,
    hat: (q, _f, hx, hy, r) => q.shape((x) => { x.arc(hx, hy + 1, r + 1.5, Math.PI, 0); x.closePath(); }, '#8b8f94'),
    over: (q, ff) => {
      const sx = ff.atk === 2 ? 24 : 17;
      q.rrect(sx - 13, -66, 24, 52, 10, '#c8a060');
      q.rrect(sx - 7, -60, 12, 40, 6, ff.team.base);
      q.line([sx - 1, -64, sx - 1, -16], '#93643b', 1.6);
    },
  }) },
  ram: { scale: 1.2, wide: true, draw: (p, f) => {
    const c = '#4f555a';
    p.c.save(); p.c.translate(lunge(f, 6), f.bob * 0.5);
    p.line([-34, -44, -40, -30], INK, 2.4);
    quadLegs(p, f, [-24, -14, 16, 26], -34, 9, c);
    p.ell(0, -42, 34, 17, c);
    p.rrect(-14, -62, 26, 14, 4, f.team.base);
    p.line([-12, -52, 10, -52], PAL.gold, 1.6);
    p.ell(36, -46, 12, 11, c);
    p.ell(44, -42, 6, 5, '#6d7378');
    p.dot(36, -49, 2, INK);
    // wide swept horns
    p.bend(30, -56, 6, -66, 4, -50, 4.5, '#e2d8bc');
    p.bend(38, -56, 62, -68, 64, -50, 4.5, '#e2d8bc');
    p.c.restore();
  } },
  kera: { scale: 1, draw: (p, f) => {
    const c = '#8a5a32';
    const hop = f.frame % 2 ? -6 : 0;
    p.c.save(); p.c.translate(lunge(f, 5), hop);
    p.bend(-12, -22, -36, -26, -30, -50, 4, c);
    p.circle(-27, -50, 4, null);
    p.limb([-6, -22, -10, -4], 7, shade(c, 0.2));
    p.limb([8, -22, 12, -4], 7, c);
    p.ell(0, -32, 14, 15, c);
    p.ell(3, -28, 8, 9, '#d8b080', false);
    p.circle(-12, -58, 6, c); p.circle(-12, -58, 3, '#d8b080', false);
    p.circle(2, -56, 15, c);
    p.ell(7, -53, 10, 9, '#d8b080');
    p.limb([-11, -66, 14, -68], 5, f.team.base);
    eyes(p, 2, -55, 12);
    p.limb([10, -40, f.atk ? 26 : 18, f.atk === 2 ? -44 : -30], 5, c);
    p.c.restore();
  } },
  harimau: { scale: 1.15, wide: true, draw: (p, f) => {
    const c = '#b8a074';
    p.c.save(); p.c.translate(lunge(f, 8), f.bob * 0.4 + (f.atk === 1 ? 3 : 0));
    p.bend(-28, -32, -52, -30, -50, -12, 6, c);
    quadLegs(p, f, [-20, -10, 14, 24], -26, 7, c);
    p.ell(0, -32, 30, 11, c);
    for (const [x, y] of [[-16, -34], [-4, -37], [8, -33], [-10, -27], [4, -27]] as const) p.ell(x, y, 4, 3, '#5a4a32', false);
    p.limb([20, -44, 24, -26], 5, f.team.base);
    p.circle(32, -40, 10, c);
    p.poly([25, -46, 26, -54, 31, -48], c);
    p.ell(39, -37, 5, 4, '#e8dcc0');
    p.dot(34, -43, 1.8, INK);
    p.c.restore();
  } },
  enggang: { scale: 1, wide: true, draw: (p, f) => {
    const up = f.frame % 2 === 0;
    p.c.save(); p.c.translate(0, f.bob * 0.5);
    // far wing
    p.shape((x) => { x.moveTo(-4, -48); x.quadraticCurveTo(-18, up ? -80 : -36, -34, up ? -78 : -30); x.lineTo(-10, -42); x.closePath(); }, '#2a2a30');
    // tail with white band
    p.poly([-20, -46, -42, -40, -42, -30, -20, -38], '#f4f0e8');
    p.line([-34, -42, -34, -32], INK, 3);
    p.ell(-2, -44, 20, 10, '#1d1d22');
    p.line([-6, -40, 10, -38], '#f4f0e8', 2.4);
    // near wing
    p.shape((x) => { x.moveTo(-2, -46); x.quadraticCurveTo(10, up ? -84 : -30, -10, up ? -82 : -24); x.lineTo(-16, -42); x.closePath(); }, '#2a2a30');
    p.line([-12, up ? -72 : -30, 0, up ? -60 : -38], '#f4f0e8', 2.4);
    // head, collar, casque and big beak
    p.limb([12, -54, 14, -44], 4, f.team.base);
    p.circle(18, -56, 8, '#1d1d22');
    p.dot(20, -58, 1.6, '#f4f0e8');
    p.shape((x) => { x.moveTo(22, -62); x.quadraticCurveTo(34, -70, 42, -62); x.quadraticCurveTo(34, -64, 24, -58); x.closePath(); }, '#e0702a');
    p.shape((x) => { x.moveTo(24, -58); x.quadraticCurveTo(40, -62, 50, -50); x.quadraticCurveTo(38, -52, 24, -52); x.closePath(); }, '#f0b030');
    p.c.restore();
  } },
  seladang: { scale: 1.25, wide: true, draw: (p, f) => {
    const c = '#3a2a22';
    p.c.save(); p.c.translate(lunge(f, 7), f.bob * 0.5);
    p.line([-34, -44, -40, -28], INK, 2.4);
    quadLegs(p, f, [-24, -14, 16, 26], -34, 9, c);
    for (const x of [-24, -14, 16, 26]) p.dot(x + (x === -14 || x === 26 ? f.leg * 5 : -f.leg * 5) * (x < 0 ? 1 : 1), -8, 3.4, '#f4f0e8');
    p.ell(0, -42, 34, 17, c);
    p.ell(12, -56, 14, 9, c);
    p.rrect(-18, -60, 22, 12, 4, f.team.base);
    p.ell(36, -44, 12, 11, c);
    p.ell(44, -40, 6, 5, '#5a4438');
    p.dot(36, -47, 2, '#f4f0e8');
    p.bend(32, -54, 26, -66, 34, -70, 4, '#e2d8bc');
    p.bend(40, -54, 48, -64, 44, -70, 4, '#e2d8bc');
    p.c.restore();
  } },
  ketam: { scale: 1.1, wide: true, draw: (p, f) => {
    const c = '#5f7060';
    const lg = f.leg * 3;
    p.c.save(); p.c.translate(lunge(f, 3) + lg, 0);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.line([s * 14, -18, s * (26 + i * 4), -4 - (i % 2) * 3], INK, 2.6);
    p.ell(0, -22, 26, 14, c);
    p.limb([-18, -28, 18, -28], 4.5, f.team.base);
    // claws (raise to strike)
    const cy = f.atk ? -46 : -38;
    for (const s of [-1, 1]) {
      p.limb([s * 16, -26, s * 26, cy + 6], 4, c);
      p.ell(s * 28, cy, 8, 6, c);
      p.poly([s * 30, cy - 4, s * 38, cy - 10, s * 34, cy], c);
    }
    p.line([-5, -34, -6, -42], INK, 2); p.line([5, -34, 6, -42], INK, 2);
    p.dot(-6, -43, 2.6, INK); p.dot(6, -43, 2.6, INK);
    p.c.restore();
  } },
  sumpit: { scale: 1.1, wide: true, draw: (p, f) => {
    const c = '#d8d0a0';
    const hop = f.frame % 2 ? -8 : 0;
    p.c.globalAlpha = 0.8;
    p.ell(0, -3, 18, 4, '#6cc4c9', '#2a8496');
    p.c.globalAlpha = 1;
    p.c.save(); p.c.translate(lunge(f, 3), hop);
    p.poly([-22, -38, -38, -50, -38, -26], c);
    p.ell(0, -38, 24, 13, c);
    for (const x of [-12, -2, 8]) p.line([x, -48, x + 2, -29], '#3a3a3a', 3);
    p.poly([-8, -50, 6, -50, -2, -62], f.team.base);
    p.poly([-6, -27, 6, -27, -2, -20], f.team.base);
    p.circle(14, -41, 4.5, '#fbf3df');
    p.dot(15, -41, 2.4, INK);
    if (f.atk === 2) p.line([24, -42, 40, -48, 50, -50], '#6cc4c9', 3);
    p.c.restore();
  } },
  belut: { scale: 1.1, wide: true, draw: (p, f) => {
    const c = '#4a5a3a';
    const ph = f.frame % 2 ? 1 : -1;
    p.c.save(); p.c.translate(lunge(f, 5), 0);
    const pts = [-34, -8, -22, -8 - ph * 8, -10, -12 + ph * 8, 2, -22 - ph * 6, 14, -34, 22, -40];
    p.limb(pts, 10, c);
    p.line(pts, '#8a9a5a', 3);
    p.limb([10, -32, 16, -38], 11, f.team.base);
    p.circle(24, -42, 7.5, c);
    p.dot(27, -44, 1.8, '#f0d040');
    const sp = '#f0d040';
    p.line([30, -54, 26, -50, 32, -48, 28, -44], sp, 2);
    p.line([-26, -24, -22, -28, -18, -24], sp, 2);
    if (f.atk) p.line([30, -42, 38, -46, 34, -40, 44, -42], sp, 2.4);
    p.c.restore();
  } },
  kerengga: { scale: 0.9, wide: true, draw: (p, f) => insect(p, f, '#d8902a', {}) },
  tebuan: { scale: 1, wide: true, draw: (p, f) => {
    const up = f.frame % 2 === 0;
    p.c.save(); p.c.translate(lunge(f, 4), f.bob * 0.5 - 10); p.c.scale(1.4, 1.4); p.c.translate(0, 8);
    p.c.globalAlpha = 0.75;
    p.ell(-2, up ? -50 : -40, 12, 6, '#f4f8fb', '#7a8a90', up ? -0.6 : 0.3);
    p.c.globalAlpha = 1;
    p.ell(-18, -30, 14, 10, '#e8c030');
    p.line([-24, -39, -22, -21], INK, 3); p.line([-14, -40, -12, -21], INK, 3);
    p.poly([-31, -30, -40, -28, -31, -26], INK);
    p.ell(0, -32, 8, 7, '#2a2418');
    p.line([-3, -38, 3, -26], f.team.base, 4.5);
    p.circle(13, -34, 7.5, '#e8c030');
    p.dot(15, -36, 2.4, INK);
    p.c.globalAlpha = 0.75;
    p.ell(2, up ? -48 : -38, 12, 6, '#ffffff', '#7a8a90', up ? -0.4 : 0.4);
    p.c.globalAlpha = 1;
    p.c.restore();
  } },
  kumbang: { scale: 1.1, wide: true, draw: (p, f) => {
    const c = '#3a2418';
    const lg = f.leg * 4;
    p.c.save(); p.c.translate(lunge(f, 5), 0);
    for (const x of [-12, 0, 12]) { p.line([x, -16, x - 6 + lg, -3], INK, 2.6); p.line([x, -16, x + 6 - lg, -3], INK, 2.6); }
    p.ell(-4, -24, 26, 16, c);
    p.ell(-10, -30, 9, 4, '#7a5a48', false);
    p.line([-4, -39, -4, -9], f.team.base, 4);
    p.circle(22, -24, 8, c);
    p.shape((x) => { x.moveTo(24, -30); x.quadraticCurveTo(30, -48, 22, -56); x.quadraticCurveTo(38, -46, 30, -26); x.closePath(); }, '#4a3020');
    p.c.restore();
  } },
  ratu: { scale: 1.1, wide: true, draw: (p, f) => insect(p, f, '#c8822a', { big: true, crown: true }) },
  kerikil: { scale: 1, draw: (p, f) => {
    const c = '#8a8a86';
    const roll = f.frame * (Math.PI / 2);
    p.c.save(); p.c.translate(lunge(f, 6), 0); p.c.scale(1.45, 1.45);
    p.circle(0, -20, 18, c);
    for (let i = 0; i < 3; i++) {
      const a = roll + i * 2.1;
      p.ell(Math.cos(a) * 10, -20 + Math.sin(a) * 9, 4, 3, '#6d6d6a', false);
    }
    p.limb([-15, -9, 2, -37], 5, f.team.base);
    p.dot(6, -22, 2.4, INK); p.dot(12, -23, 2.4, INK);
    p.shape((x) => { x.arc(10, -17, 4, 0.2, Math.PI - 0.2); }, null, true);
    p.c.restore();
  } },
  golem: { scale: 1.35, draw: (p, f) => {
    const c = '#7d7f86';
    const sw = f.leg * 5;
    p.c.save(); p.c.translate(lunge(f, 5), f.bob * 0.5);
    p.limb([-10, -26, -12 - sw, -5], 12, shade(c, 0.25));
    p.limb([10, -26, 12 + sw, -5], 12, c);
    p.circle(-24, -46, 10, shade(c, 0.2));
    p.limb([-24, -46, -28, -24], 11, shade(c, 0.2));
    p.ell(0, -48, 22, 24, c);
    p.ell(-8, -58, 8, 5, '#6d6f76', false);
    p.ell(6, -36, 9, 6, '#6d6f76', false);
    p.ell(-12, -40, 5, 3, '#5f8a3a', false);
    p.poly([-20, -60, -14, -64, 20, -40, 14, -36], f.team.base);
    p.circle(4, -78, 11, c);
    p.dot(7, -79, 2.6, '#f6c74a'); p.dot(13, -79, 2.6, '#f6c74a');
    const ax = f.atk === 2 ? 34 : f.atk === 1 ? 20 : 24;
    const ay = f.atk === 1 ? -72 : f.atk === 2 ? -44 : -36;
    p.limb([18, -54, ax, ay], 11, c);
    p.circle(ax, ay, 9, c);
    p.c.restore();
  } },
  lontar: { scale: 1.05, wide: true, draw: (p, f) => {
    const wood = '#93643b';
    const spin = f.frame * 0.8;
    p.c.save(); p.c.translate(0, 0);
    p.limb([-26, -14, 26, -14], 6, wood);
    for (const wx of [-18, 18]) {
      p.circle(wx, -10, 8, '#6b4426');
      for (let i = 0; i < 2; i++) { const a = spin + i * (Math.PI / 2); p.line([wx - Math.cos(a) * 7, -10 - Math.sin(a) * 7, wx + Math.cos(a) * 7, -10 + Math.sin(a) * 7], '#3f2717', 1.6); }
      p.dot(wx, -10, 2, PAL.gold);
    }
    p.limb([-8, -14, 2, -40], 4.5, wood);
    p.limb([12, -14, 2, -40], 4.5, wood);
    const arm = f.atk === 2 ? -1.1 : f.atk === 1 ? 0.5 : 0.1;
    const ex = 2 + Math.cos(Math.PI + arm) * -30;
    const ey = -40 - Math.sin(Math.PI + arm) * -30 * (f.atk === 2 ? 1 : -0.2) - (f.atk === 2 ? 26 : 0);
    p.limb([2 - (ex - 2) * 0.4, -40 - (ey + 40) * 0.4, ex, ey], 4, '#7a5230');
    if (f.atk !== 2) p.circle(ex, ey - 4, 6, '#8a8a86');
    p.line([-24, -14, -24, -48], '#3f2717', 1.6);
    p.poly([-24, -48, -10, -44, -24, -40], f.team.base);
    p.c.restore();
  } },
  puppet: { scale: 1, draw: (p, f) => {
    const sway = f.frame % 2 ? 2 : -2;
    p.c.save(); p.c.translate(sway, 0);
    p.line([0, -4, 0, -30], '#5a3e22', 2.2);
    p.glow(0, -56, 30, f.team.light, 0.55);
    const d = '#2a1d28';
    p.shape((x) => {
      x.moveTo(-3, -82); x.lineTo(2, -92); x.lineTo(6, -82);
      x.quadraticCurveTo(14, -78, 16, -72); x.lineTo(7, -71);
      x.lineTo(10, -50); x.lineTo(14, -26); x.lineTo(-12, -26);
      x.lineTo(-8, -52); x.lineTo(-5, -72); x.closePath();
    }, d, f.team.base);
    for (const y of [-62, -52, -42, -34]) p.dot(0, y, 1.4, PAL.gold);
    p.line([6, -64, 22, -50], d, 2);
    p.line([22, -50, 10, -4], '#5a3e22', 1);
    p.c.restore();
  } },
  decoy: { scale: 0.8, draw: (p, f) => {
    p.c.globalAlpha = 0.5;
    human(p, f, {
      skin: f.team.light, top: f.team.light, bottom: f.team.light, sash: false,
      head: (q, _f, hx, hy, r) => {
        q.ell(hx - r * 0.55, hy - r * 1.05, r * 0.32, r * 0.75, f.team.light, true, -0.35);
        q.ell(hx + r * 0.1, hy - r * 1.1, r * 0.3, r * 0.72, f.team.light, true, 0.15);
        q.circle(hx, hy, r * 0.82, f.team.light);
        q.ell(hx + r * 0.75, hy + r * 0.3, r * 0.55, r * 0.38, f.team.light);
      },
    });
    p.c.globalAlpha = 1;
  } },
  watchtower: { scale: 1.4, draw: (p, f) => {
    const b = '#7aa83a';
    const d = '#5a7a2a';
    p.limb([-14, -2, -10, -62], 4, d);
    p.limb([14, -2, 10, -62], 4, d);
    p.line([-13, -14, 12, -38], d, 2.4);
    p.line([13, -14, -12, -38], d, 2.4);
    p.rrect(-18, -66, 36, 8, 2, b);
    p.limb([-14, -66, -14, -84], 3, d);
    p.limb([14, -66, 14, -84], 3, d);
    p.poly([-24, -82, 24, -82, 0, -102], '#b8955a');
    p.line([0, -102, 0, -116], '#3f2717', 1.6);
    p.poly([0, -116, 14, -112, 0, -107], f.team.base);
  } },
  gajahmina: { scale: 1.7, wide: true, draw: (p, f) => {
    const c = '#4a7a84';
    const sw = f.leg * 3;
    p.c.save(); p.c.translate(lunge(f, 6), f.bob * 0.5);
    // fish tail rising behind
    p.shape((x) => { x.moveTo(-26, -34); x.quadraticCurveTo(-42, -40, -50, -64 + sw); x.quadraticCurveTo(-44, -50, -36, -50); x.quadraticCurveTo(-46, -36, -54, -30 - sw); x.quadraticCurveTo(-40, -26, -24, -26); x.closePath(); }, c);
    p.ell(-4, -32, 30, 18, c);
    for (const [x, y] of [[-18, -36], [-8, -40], [2, -36], [-12, -28], [-2, -26]] as const) p.shape((q) => q.arc(x, y, 4, Math.PI, 0), null, '#2f5a62');
    p.limb([-8, -18, -6 - sw, -4], 9, shade(c, 0.2));
    p.limb([10, -18, 12 + sw, -4], 9, c);
    p.rrect(-16, -54, 22, 12, 4, f.team.base);
    // elephant head, ear, trunk and tusks
    p.ell(16, -40, 9, 14, shade(c, 0.12));
    p.circle(26, -46, 14, c);
    p.bend(34, -40, 46, -30, 40, f.atk === 2 ? -36 : -14, 6, c);
    p.bend(30, -36, 40, -32, 44, -40, 3, '#f4f0e8');
    p.dot(28, -50, 2.2, INK);
    p.c.restore();
  } },
};

// ---------------------------------------------------------------------------------------------
// bases, shadows and the bitmap cache

function standeeBase(p: Pen, f: Pose, kind: 'hero' | 'troop' | 'wave' | 'none', w: number): void {
  if (kind === 'none') return;
  if (kind === 'hero') {
    p.ell(0, 0, w + 3, 10, PAL.gold);
    p.ell(0, -0.5, w - 1, 7, f.team.base);
    p.ell(-w * 0.25, -2.5, w * 0.35, 2, tint(f.team.base, 0.35), false);
  } else if (kind === 'troop') {
    p.ell(0, 0, w, 8, f.team.base);
    p.ell(-w * 0.25, -2, w * 0.3, 1.8, tint(f.team.base, 0.35), false);
  } else {
    p.c.globalAlpha = 0.85;
    p.ell(0, 0, w * 0.85, 6.5, f.team.base);
    p.c.globalAlpha = 1;
  }
}

const BOX = { x0: -80, x1: 80, y0: -142, y1: 16 } as const;
const cache = new Map<string, HTMLCanvasElement>();
const CACHE_CAP = 900;

function bitmap(key: string, hb: number, dpr: number, render: (p: Pen) => void): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const s = hb / 100;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil((BOX.x1 - BOX.x0) * s * dpr));
  cv.height = Math.max(1, Math.ceil((BOX.y1 - BOX.y0) * s * dpr));
  const c = cv.getContext('2d');
  if (c) {
    c.setTransform(s * dpr, 0, 0, s * dpr, -BOX.x0 * s * dpr, -BOX.y0 * s * dpr);
    const linePx = Math.min(2, Math.max(0.9, hb * 0.036));
    render(new Pen(c, linePx / s));
  }
  if (cache.size >= CACHE_CAP) {
    let n = 0;
    for (const k of cache.keys()) { cache.delete(k); if (++n >= 150) break; }
  }
  cache.set(key, cv);
  return cv;
}

function blit(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, x: number, y: number, hb: number, alpha: number): void {
  const s = hb / 100;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * alpha;
  ctx.drawImage(cv, x + BOX.x0 * s, y + BOX.y0 * s, (BOX.x1 - BOX.x0) * s, (BOX.y1 - BOX.y0) * s);
  ctx.globalAlpha = a;
}

const bucket = (h: number) => Math.max(6, Math.round(h / 2) * 2);
const dprKey = (d: number) => Math.round(d * 100) / 100;

/** Relative size of a hero figure (applied inside drawHeroFigure). */
export function heroScale(kind: HeroKind): number {
  return HEROES_ART[kind].scale;
}

/** Relative size of a troop figure (applied inside drawTroopFigure). */
export function troopScale(kind: UnitKind): number {
  return TROOPS_ART[kind].scale;
}

/**
 * Draws a hero standing on (x, y), the ground point under its feet. `height` is the base figure
 * height in CSS px; heroScale(kind) is applied here. Fliers (and Layang always) hover above their shadow.
 */
export function drawHeroFigure(ctx: CanvasRenderingContext2D, kind: HeroKind, x: number, y: number, height: number, owner: number, dpr: number, o: FigureOpts): void {
  const art = HEROES_ART[kind];
  const hb = bucket(height * art.scale * (kind === 'belang' && o.transformed ? 1.12 : 1));
  const fly = !!o.flying || kind === 'layang';
  const frame = frameOf(o);
  const tr = kind === 'belang' && !!o.transformed;
  const d = dprKey(dpr);
  const key = `h|${kind}|${owner}|${frame}|${o.facing}|${tr ? 1 : 0}|${fly ? 1 : 0}|${hb}|${d}`;
  const cv = bitmap(key, hb, d, (p) => {
    const f = poseOf(frame, owner, tr);
    p.ell(3, 2, tr ? 40 : 30, 8, 'rgba(10,20,10,0.35)', false);
    if (!fly) standeeBase(p, f, 'hero', tr ? 36 : 26);
    else p.ell(0, 0, 16, 5, f.team.base, true);
    p.c.save();
    if (fly) p.c.translate(0, -25);
    p.c.scale(o.facing, 1);
    art.draw(p, f);
    p.c.restore();
  });
  blit(ctx, cv, x, y, hb, o.alpha ?? 1);
}

/**
 * Draws a troop or summon on (x, y). `height` is the base height in CSS px; troopScale(kind) (and
 * 0.88 for lane-wave troops) is applied here.
 */
export function drawTroopFigure(ctx: CanvasRenderingContext2D, kind: UnitKind, x: number, y: number, height: number, owner: number, dpr: number, o: FigureOpts): void {
  const art = TROOPS_ART[kind];
  const hb = bucket(height * art.scale * (o.wave ? 0.88 : 1));
  const fly = !!o.flying || kind === 'enggang' || kind === 'tebuan';
  const frame = kind === 'watchtower' ? 0 : frameOf(o);
  const d = dprKey(dpr);
  const key = `t|${kind}|${owner}|${frame}|${o.facing}|${o.wave ? 1 : 0}|${fly ? 1 : 0}|${hb}|${d}`;
  const cv = bitmap(key, hb, d, (p) => {
    const f = poseOf(frame, owner, false);
    const w = art.wide ? 34 : 24;
    p.ell(3, 2, w + 2, 7, 'rgba(10,20,10,0.35)', false);
    if (!fly) standeeBase(p, f, kind === 'watchtower' ? 'none' : o.wave ? 'wave' : 'troop', w);
    else p.ell(0, 0, 13, 4.5, f.team.base, true);
    p.c.save();
    if (fly) p.c.translate(0, -25);
    p.c.scale(o.facing, 1);
    art.draw(p, f);
    p.c.restore();
  });
  blit(ctx, cv, x, y, hb, o.alpha ?? 1);
}

/** A head-and-shoulders bust in a team-coloured ring, for HUD panels and banners. */
export function drawPortrait(ctx: CanvasRenderingContext2D, kind: HeroKind, cx: number, cy: number, r: number, owner: number, dpr: number): void {
  const art = HEROES_ART[kind];
  const team = teamColors(owner);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
  const g = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, tint(team.base, 0.35));
  g.addColorStop(1, team.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const H = bucket(r * 3.3);
  const feetX = cx - art.headX * (H / 100) - r * 0.05;
  const feetY = cy + r * 0.12 - art.headY * (H / 100);
  const d = dprKey(dpr);
  const key = `p|${kind}|${owner}|${H}|${d}`;
  const cv = bitmap(key, H, d, (p) => {
    const f = poseOf(0, owner, false);
    art.draw(p, f);
  });
  blit(ctx, cv, feetX, feetY, H, 1);
  ctx.restore();
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.strokeStyle = team.base;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = PAL.gold;
  ctx.beginPath(); ctx.arc(cx, cy, r + Math.max(1.5, r * 0.12) / 2 + 0.6, 0, TAU); ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r + Math.max(1.5, r * 0.12) / 2 + 1.6, 0, TAU); ctx.stroke();
}
