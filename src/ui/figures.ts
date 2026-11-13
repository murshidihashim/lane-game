// Character figures (DEC-013, DEC-018): heroes and troops as die-cut paper standees in the batik
// paper style (docs/design/art-style.md). Each piece is drawn in code on a grid 100 units tall
// (feet at 0, head near -100), on a team-coloured paper base, given a white cut edge and a paper
// shadow, and cached as a bitmap per pose so ~80 figures a frame stay cheap on a phone.
// Drawing only; no game rules.
import type { HeroKind, UnitKind } from '../game/rules';
import { PAL, cutOut, teamColors } from './art';

const INK = PAL.ink;
const TAU = Math.PI * 2;

export interface FigureOpts {
  facing: 1 | -1;
  /** Walk phase 0..1 (loops, best driven by distance walked); drawn as 8 frames. 0 = standing (see idle). */
  walk: number;
  /** 0 = not attacking; 0..1 = swing progress: wind-up below 0.35, strike to 0.7, then follow-through. */
  attack: number;
  /** Idle phase 0..1 (loops, time-based), used when walk and attack are 0: breathing, sway, hover; 4 frames. */
  idle?: number;
  /** 0..1 just after taking damage (1 = this instant): a white flash of the figure and a small recoil. */
  hurt?: number;
  /** 0..1 while appearing (0 = just spawned, 1 = arrived): rises from its base with a dust ring. */
  spawn?: number;
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
// a tiny pen: filled shapes with an ink outline and simple cel shading, thick limbs with an ink rim

/** The path calls the art uses; recorded into a Path2D (for shading) and the context (for strokes). */
class PathRec {
  readonly path = new Path2D();
  x0 = Infinity; y0 = Infinity; x1 = -Infinity; y1 = -Infinity;
  constructor(private readonly c: CanvasRenderingContext2D) { c.beginPath(); }
  private see(x: number, y: number, r = 0): void {
    if (x - r < this.x0) this.x0 = x - r;
    if (y - r < this.y0) this.y0 = y - r;
    if (x + r > this.x1) this.x1 = x + r;
    if (y + r > this.y1) this.y1 = y + r;
  }
  moveTo(x: number, y: number): void { this.path.moveTo(x, y); this.c.moveTo(x, y); this.see(x, y); }
  lineTo(x: number, y: number): void { this.path.lineTo(x, y); this.c.lineTo(x, y); this.see(x, y); }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this.path.quadraticCurveTo(cx, cy, x, y); this.c.quadraticCurveTo(cx, cy, x, y);
    this.see((cx + x) / 2, (cy + y) / 2); this.see(x, y);
  }
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw = false): void {
    this.path.arc(x, y, r, a0, a1, ccw); this.c.arc(x, y, r, a0, a1, ccw); this.see(x, y, r);
  }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number): void {
    this.path.ellipse(x, y, rx, ry, rot, a0, a1); this.c.ellipse(x, y, rx, ry, rot, a0, a1); this.see(x, y, Math.max(rx, ry));
  }
  closePath(): void { this.path.closePath(); this.c.closePath(); }
}

const isHex = (c: string) => c.length === 7 && c[0] === '#';

class Pen {
  /** Cel shading on (off for bases and shadows). */
  cel = false;
  /** +1 / -1: the figure's facing, so the light stays top-left on screen whichever way it faces. */
  fx = 1;

  constructor(readonly c: CanvasRenderingContext2D, readonly lw: number) {}

  /**
   * Fill and outline a recorded path. Cel shading: the far side from the light (bottom-right on
   * screen) gets one darker tone: fill the shape dark, then refill it shifted towards the light.
   */
  private end(r: PathRec, fill: string | null, stroke: boolean | string): void {
    const c = this.c;
    if (fill) {
      c.fillStyle = fill;
      c.fill(r.path);
      const size = Math.min(r.x1 - r.x0, r.y1 - r.y0);
      if (this.cel && isHex(fill) && size >= 5) {
        const k = Math.min(3, size * 0.16);
        c.save();
        c.clip(r.path);
        c.fillStyle = shade(fill, 0.2);
        c.fill(r.path);
        c.translate(-k * this.fx, -k);
        c.fillStyle = fill;
        c.fill(r.path);
        c.restore();
      }
    }
    if (stroke) { c.lineWidth = this.lw; c.strokeStyle = typeof stroke === 'string' ? stroke : INK; c.stroke(r.path); }
  }
  /** A small soft highlight on the lit (top-left) side of a round shape. */
  private shine(x: number, y: number, rx: number, ry: number, fill: string | null): void {
    if (!this.cel || !fill || !isHex(fill) || Math.min(rx, ry) < 6) return;
    const c = this.c;
    c.save();
    c.globalAlpha *= 0.32;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(x - rx * 0.38 * this.fx, y - ry * 0.42, rx * 0.26, ry * 0.16, -0.5 * this.fx, 0, TAU);
    c.fill();
    c.restore();
  }
  circle(x: number, y: number, r: number, fill: string | null, stroke: boolean | string = true): void {
    const rec = new PathRec(this.c);
    rec.arc(x, y, Math.max(0.1, r), 0, TAU);
    this.end(rec, fill, stroke);
    this.shine(x, y, r, r, fill);
  }
  ell(x: number, y: number, rx: number, ry: number, fill: string | null, stroke: boolean | string = true, rot = 0): void {
    const rec = new PathRec(this.c);
    rec.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
    this.end(rec, fill, stroke);
    if (rot === 0) this.shine(x, y, rx, ry, fill);
  }
  poly(pts: readonly number[], fill: string | null, stroke: boolean | string = true, close = true): void {
    this.c.lineJoin = 'round';
    const rec = new PathRec(this.c);
    rec.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) rec.lineTo(pts[i], pts[i + 1]);
    if (close) rec.closePath();
    this.end(rec, fill, stroke);
  }
  shape(fn: (x: PathRec) => void, fill: string | null, stroke: boolean | string = true): void {
    this.c.lineJoin = 'round';
    const rec = new PathRec(this.c);
    fn(rec);
    this.end(rec, fill, stroke);
  }
  /** A thick rounded stroke (arm, leg, pole) with an ink rim; shaded along its far side. */
  limb(pts: readonly number[], w: number, color: string, outline = true): void {
    const c = this.c;
    c.lineCap = 'round'; c.lineJoin = 'round';
    const trace = (dx: number, dy: number) => {
      c.beginPath(); c.moveTo(pts[0] + dx, pts[1] + dy);
      for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i] + dx, pts[i + 1] + dy);
    };
    trace(0, 0);
    if (outline) { c.strokeStyle = INK; c.lineWidth = w + this.lw * 2; c.stroke(); }
    if (this.cel && w >= 4 && isHex(color)) {
      c.strokeStyle = shade(color, 0.22); c.lineWidth = w; c.stroke();
      const k = w * 0.2;
      trace(-k * this.fx, -k);
      c.strokeStyle = color; c.lineWidth = w * 0.62; c.stroke();
    } else {
      c.strokeStyle = color; c.lineWidth = w; c.stroke();
    }
  }
  /** Same, along a quadratic curve. */
  bend(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, w: number, color: string, outline = true): void {
    const c = this.c;
    c.lineCap = 'round';
    const trace = (dx: number, dy: number) => { c.beginPath(); c.moveTo(x1 + dx, y1 + dy); c.quadraticCurveTo(cx + dx, cy + dy, x2 + dx, y2 + dy); };
    trace(0, 0);
    if (outline) { c.strokeStyle = INK; c.lineWidth = w + this.lw * 2; c.stroke(); }
    if (this.cel && w >= 4 && isHex(color)) {
      c.strokeStyle = shade(color, 0.22); c.lineWidth = w; c.stroke();
      const k = w * 0.2;
      trace(-k * this.fx, -k);
      c.strokeStyle = color; c.lineWidth = w * 0.62; c.stroke();
    } else {
      c.strokeStyle = color; c.lineWidth = w; c.stroke();
    }
  }
  /** An arc drawn as a rimmed stroke (bows). */
  arcLine(x: number, y: number, r: number, a0: number, a1: number, w: number, color: string): void {
    const c = this.c;
    c.lineCap = 'round';
    c.beginPath(); c.arc(x, y, r, a0, a1);
    c.strokeStyle = INK; c.lineWidth = w + this.lw * 1.6; c.stroke();
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
    const rec = new PathRec(this.c);
    const q = Math.min(r, w / 2, h / 2);
    rec.moveTo(x + q, y);
    rec.lineTo(x + w - q, y); rec.quadraticCurveTo(x + w, y, x + w, y + q);
    rec.lineTo(x + w, y + h - q); rec.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
    rec.lineTo(x + q, y + h); rec.quadraticCurveTo(x, y + h, x, y + h - q);
    rec.lineTo(x, y + q); rec.quadraticCurveTo(x, y, x + q, y);
    rec.closePath();
    this.end(rec, fill, stroke);
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

/** Frames: 0-7 walk (contact at 0 and 4, passing at 2 and 6), 8 wind-up, 9 strike, 10 follow-through, 11-14 idle. */
const WALK = 8;
const ATK0 = 8;
const IDLE0 = 11;

interface Pose {
  frame: number;
  walking: boolean;
  phase: number; // walk phase 0..1 (0 when not walking)
  leg: number; // -1..1 swing of the near leg (the far leg mirrors it)
  leg2: number; // the same swing a quarter cycle later (four-legged gaits, insect legs)
  lift: number; // -1..1: > 0 the far leg is stepping (lifted), < 0 the near leg
  bob: number; // body bob, units (negative = up)
  arm: number; // back-arm swing -1..1 (forward = +)
  atk: 0 | 1 | 2; // 1 wind-up, 2 strike or follow-through
  follow: boolean; // the follow-through beat
  flap: number; // -1..1 wing beat (fliers flap while walking and idling)
  breathe: number; // 0..1 idle breath
  team: Team;
  transformed: boolean;
  bust: boolean; // drawn for a portrait (props that would hide the face are left out)
}

const wrap01 = (v: number) => ((v % 1) + 1) % 1;

function frameOf(o: FigureOpts): number {
  if (o.attack > 0) return ATK0 + (o.attack < 0.35 ? 0 : o.attack < 0.7 ? 1 : 2);
  if (o.walk === 0) return IDLE0 + (Math.floor(wrap01(o.idle ?? 0) * 4) % 4);
  return Math.floor(wrap01(o.walk) * WALK) % WALK;
}

function poseOf(frame: number, owner: number, transformed: boolean): Pose {
  const team = teamColors(owner);
  if (frame < WALK) {
    const a = (frame / WALK) * TAU;
    return {
      frame, walking: true, phase: frame / WALK, leg: Math.cos(a), leg2: -Math.sin(a), lift: Math.sin(a),
      bob: -2.6 * Math.abs(Math.sin(a)), arm: Math.cos(a), atk: 0, follow: false, flap: Math.cos(a * 2), breathe: 0, team, transformed, bust: false,
    };
  }
  if (frame < IDLE0) {
    const k = frame - ATK0;
    return {
      frame, walking: false, phase: 0, leg: [-0.45, 0.7, 0.85][k], leg2: [0.3, -0.4, -0.5][k], lift: 0,
      bob: [-1.5, 1.2, 1.8][k], arm: [-0.6, 0.6, 0.8][k], atk: k === 0 ? 1 : 2, follow: k === 2, flap: [1, -1, 0][k], breathe: 0, team, transformed, bust: false,
    };
  }
  const k = frame - IDLE0;
  const b = [0, 0.5, 1, 0.5][k];
  return {
    frame, walking: false, phase: 0, leg: 0, leg2: 0, lift: 0, bob: -1.3 * b, arm: 0.2 * b, atk: 0, follow: false,
    flap: [1, 0, -1, 0][k], breathe: b, team, transformed, bust: false,
  };
}

/** Hand position and held-weapon angle for the front hand (canvas angles: -PI/2 is up). */
function grip(f: Pose, style: 'melee' | 'ranged' | 'hold'): { x: number; y: number; a: number } {
  const sway = f.walking ? f.leg * 2 : f.breathe * 1.2;
  if (style === 'melee') {
    if (f.atk === 1) return { x: 0, y: -86, a: -2.5 };
    if (f.follow) return { x: 25, y: -38, a: 0.55 };
    if (f.atk === 2) return { x: 30, y: -57, a: -0.22 };
    return { x: 18 + sway, y: -45 - f.breathe, a: -1.15 };
  }
  if (style === 'ranged') {
    if (f.atk === 1) return { x: 19, y: -64, a: 0 };
    if (f.follow) return { x: 23, y: -62, a: 0.05 };
    if (f.atk === 2) return { x: 26, y: -65, a: -0.05 };
    return { x: 18 + sway, y: -47 - f.breathe, a: -1.2 };
  }
  if (f.atk === 1) return { x: 15, y: -67, a: -1.55 };
  if (f.follow) return { x: 24, y: -62, a: -1.0 };
  if (f.atk === 2) return { x: 26, y: -68, a: -0.9 };
  return { x: 17 + sway * 0.6, y: -50 - f.breathe, a: -1.45 };
}

/** Two eyes facing forward, each with a white glint. */
function eyes(p: Pen, hx: number, hy: number, r: number, color: string = INK): void {
  const er = Math.max(1.6, r * 0.13);
  for (const ex of [hx + r * 0.16, hx + r * 0.62]) {
    p.dot(ex, hy, er, color);
    p.dot(ex - er * 0.35, hy - er * 0.4, er * 0.42, '#ffffff');
  }
}

type Mood = 'stern' | 'grin' | 'calm' | 'sly' | 'fierce';

/** Brows and mouth: one expression per hero. */
function mood(p: Pen, hx: number, hy: number, r: number, m: Mood): void {
  const w = Math.max(1.2, r * 0.09);
  const by = hy - r * 0.3;
  const b1 = hx + r * 0.16;
  const b2 = hx + r * 0.62;
  const my = hy + r * 0.48;
  const mx = hx + r * 0.42;
  switch (m) {
    case 'stern':
      p.line([b1 - r * 0.18, by - r * 0.06, b1 + r * 0.14, by + r * 0.04], INK, w);
      p.line([b2 - r * 0.14, by + r * 0.04, b2 + r * 0.18, by - r * 0.06], INK, w);
      p.line([mx - r * 0.18, my, mx + r * 0.2, my], INK, w * 0.9);
      break;
    case 'fierce':
      p.line([b1 - r * 0.18, by - r * 0.14, b1 + r * 0.16, by + r * 0.08], INK, w * 1.1);
      p.line([b2 - r * 0.16, by + r * 0.08, b2 + r * 0.18, by - r * 0.14], INK, w * 1.1);
      p.shape((q) => { q.moveTo(mx - r * 0.18, my - r * 0.03); q.lineTo(mx + r * 0.2, my - r * 0.03); q.quadraticCurveTo(mx + r * 0.02, my + r * 0.2, mx - r * 0.18, my - r * 0.03); q.closePath(); }, '#7a2a24', false);
      break;
    case 'grin':
      p.line([b1 - r * 0.15, by, b1, by - r * 0.08, b1 + r * 0.15, by], INK, w * 0.9);
      p.line([b2 - r * 0.15, by, b2, by - r * 0.08, b2 + r * 0.15, by], INK, w * 0.9);
      p.shape((q) => { q.moveTo(mx - r * 0.24, my - r * 0.06); q.quadraticCurveTo(mx, my + r * 0.24, mx + r * 0.26, my - r * 0.06); q.closePath(); }, '#fbf3df', INK);
      break;
    case 'calm':
      p.line([b1 - r * 0.14, by + r * 0.02, b1, by - r * 0.04, b1 + r * 0.14, by + r * 0.02], INK, w * 0.8);
      p.line([b2 - r * 0.14, by + r * 0.02, b2, by - r * 0.04, b2 + r * 0.14, by + r * 0.02], INK, w * 0.8);
      p.line([mx - r * 0.14, my - r * 0.02, mx, my + r * 0.06, mx + r * 0.14, my - r * 0.02], INK, w * 0.8);
      break;
    case 'sly':
      p.line([b1 - r * 0.16, by + r * 0.04, b1 + r * 0.14, by + r * 0.02], INK, w);
      p.line([b2 - r * 0.14, by - r * 0.04, b2 + r * 0.04, by - r * 0.14, b2 + r * 0.18, by - r * 0.08], INK, w);
      p.line([mx - r * 0.16, my + r * 0.02, mx + r * 0.08, my + r * 0.02, mx + r * 0.22, my - r * 0.08], INK, w * 0.9);
      break;
  }
}

// ---------------------------------------------------------------------------------------------
// the heroic humanoid template (PLAN-014, DEC-022): about five heads tall, broad shoulders, longer
// legs, and costume parts (pauldrons, chest armour, belt, skirt, bracers, boots, cape). Dota 2 is
// the quality bar, not a source: every design here is our own.

interface Build { hip: number; sh: number; wSh: number; wHip: number; legW: number; armW: number; headY: number; headR: number }

const BUILDS = {
  slim: { hip: -40, sh: -68, wSh: 13, wHip: 9, legW: 7.5, armW: 6.5, headY: -82, headR: 11 },
  stocky: { hip: -38, sh: -67, wSh: 17, wHip: 13, legW: 9.5, armW: 8.5, headY: -81, headR: 11 },
  robe: { hip: -40, sh: -68, wSh: 13, wHip: 17, legW: 7, armW: 6.5, headY: -82, headR: 11 },
  belly: { hip: -38, sh: -67, wSh: 15, wHip: 14, legW: 9, armW: 7.5, headY: -81, headR: 11 },
  giant: { hip: -40, sh: -76, wSh: 25, wHip: 16, legW: 13, armW: 12.5, headY: -88, headR: 10 },
} satisfies Record<string, Build>;

type BuildName = keyof typeof BUILDS;

interface Hold { x: number; y: number; a: number }

type PauldronStyle = 'round' | 'spiked' | 'stone' | 'feather' | 'shell' | 'leaf' | 'fur';

/** Costume parts every humanoid can wear. */
interface Gear {
  pauldrons?: string;
  pauldronStyle?: PauldronStyle;
  /** Only the near shoulder (an asymmetric piece reads from the game camera). */
  onePauldron?: boolean;
  chest?: string; // a plate over the chest, gold-trimmed
  belt?: string; // a belt with a gold buckle
  skirt?: string; // a panel below the belt (sarong, tabard, armoured skirt)
  skirtTrim?: string;
  bracers?: string;
  boots?: string;
  cape?: string;
  capeTrim?: string;
  capeLong?: boolean;
  /** Glowing eyes (magic users, beasts). */
  eyeGlow?: string;
}

interface Human extends Gear {
  skin: string;
  top: string;
  bottom: string;
  sleeve?: string;
  build?: BuildName;
  style?: 'melee' | 'ranged' | 'hold';
  sash?: boolean; // team sash across the chest (default true)
  hair?: string;
  /** The expression on a plain round head. */
  mood?: Mood;
  /** Replaces the plain round head (face, ears, snout...). */
  head?: (p: Pen, f: Pose, hx: number, hy: number, r: number) => void;
  /** Drawn over the head (hats, hoods, helms). */
  hat?: (p: Pen, f: Pose, hx: number, hy: number, r: number) => void;
  /** Behind the body, in front of the cape (packs, quivers, wings, tails). */
  back?: (p: Pen, f: Pose, b: Build) => void;
  /** The prop in the front hand. */
  front?: (p: Pen, f: Pose, g: Hold, b: Build) => void;
  /** After the front arm (shields that cover the hand). */
  over?: (p: Pen, f: Pose, g: Hold, b: Build) => void;
  /** Replaces the legs (a wave, a coil). */
  legs?: (p: Pen, f: Pose, b: Build) => void;
  /** Extra torso detail (stripes, scales, harness). */
  torso?: (p: Pen, f: Pose, b: Build) => void;
}

/** Hip -> knee -> foot. A stepping leg bends its knee forward and lifts its foot. */
function legPts(x0: number, hipY: number, sw: number, lift: number): number[] {
  const fx = x0 + sw + lift * 2;
  const fy = -5 - lift * 9;
  const kx = (x0 + fx) / 2 + 3 + lift * 6;
  const ky = (hipY + fy) / 2 - lift * 3;
  return [x0, hipY, kx, ky, fx, fy];
}

/** The white smear a melee strike leaves (drawn behind the arm). */
function smear(p: Pen, cx: number, cy: number): void {
  p.shape((q) => {
    q.arc(cx, cy, 60, -2.2, 0.3);
    q.quadraticCurveTo(cx + 32, cy + 19, cx + 28, cy + 9);
    q.arc(cx + 2, cy + 2, 40, 0.25, -2.0, true);
    q.closePath();
  }, 'rgba(255,246,220,0.62)', false);
  p.line([cx - 24, cy - 49, cx + 19, cy - 53, cx + 47, cy - 32], 'rgba(255,255,255,0.8)', 1.6);
}

/** One leg: thigh, then shin (in boots if any), then the foot. */
function leg(p: Pen, x0: number, b: Build, sw: number, lift: number, h: Human, far: boolean): void {
  const [hx, hy, kx, ky, fx, fy] = legPts(x0, b.hip, sw, lift);
  const k = far ? 0.24 : 0;
  const pants = shade(h.bottom, k);
  p.limb([hx, hy, kx, ky], b.legW, pants);
  p.limb([kx, ky, fx, fy], b.legW * (h.boots ? 1.08 : 0.95), h.boots ? shade(h.boots, k) : pants);
  if (h.boots) p.line([kx - b.legW * 0.5, ky + 2, kx + b.legW * 0.5, ky + 1], shade(PAL.gold, k), 1.2);
  p.ell(fx + 2.5, fy + 1.5, b.legW * 0.95, 3.3, h.boots ? shade(h.boots, 0.35 + k) : INK, false, lift * -0.3);
}

/** A shoulder piece in one of several styles. */
function pauldron(p: Pen, x: number, y: number, r: number, color: string, style: PauldronStyle, dark: boolean): void {
  const col = dark ? shade(color, 0.28) : color;
  switch (style) {
    case 'spiked':
      for (const a of [-2.1, -1.55, -1.0]) p.poly([x + Math.cos(a - 0.22) * r * 0.8, y + Math.sin(a - 0.22) * r * 0.8, x + Math.cos(a) * r * 1.7, y + Math.sin(a) * r * 1.7, x + Math.cos(a + 0.22) * r * 0.8, y + Math.sin(a + 0.22) * r * 0.8], dark ? shade('#d8dde0', 0.3) : '#d8dde0');
      p.ell(x, y, r, r * 0.8, col);
      break;
    case 'stone':
      p.poly([x - r, y + r * 0.2, x - r * 0.8, y - r * 0.8, x - r * 0.1, y - r * 1.1, x + r * 0.9, y - r * 0.6, x + r * 1.05, y + r * 0.35, x + r * 0.2, y + r * 0.75, x - r * 0.6, y + r * 0.7], col);
      p.line([x - r * 0.3, y - r * 0.7, x - r * 0.05, y - r * 0.1, x - r * 0.35, y + r * 0.4], shade(col, 0.35), 1.2);
      break;
    case 'feather':
      for (const [dx, a] of [[-r * 0.5, 0.6], [0, 0.95], [r * 0.5, 1.3]] as const) p.ell(x + dx, y + r * 0.35, r * 0.42, r * 0.95, col, true, a - 0.9);
      break;
    case 'shell':
      p.shape((q) => { q.moveTo(x - r, y + r * 0.5); q.quadraticCurveTo(x - r * 0.9, y - r * 1.0, x, y - r * 1.05); q.quadraticCurveTo(x + r * 0.9, y - r * 1.0, x + r, y + r * 0.5); q.closePath(); }, col);
      for (const dx of [-0.5, 0, 0.5]) p.line([x + dx * r * 0.4, y + r * 0.4, x + dx * r * 1.2, y - r * 0.75], shade(col, 0.3), 1);
      break;
    case 'leaf':
      for (const a of [-2.4, -1.6, -0.8]) p.ell(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.5, r * 1.0, col, true, a + Math.PI / 2);
      break;
    case 'fur':
      p.ell(x, y, r * 1.1, r * 0.85, col);
      for (let i = 0; i < 4; i++) p.line([x - r + i * r * 0.6, y + r * 0.6, x - r * 0.8 + i * r * 0.6, y + r * 1.05], shade(col, 0.3), 1.4);
      break;
    default:
      p.ell(x, y, r, r * 0.78, col);
      p.shape((q) => { q.ellipse(x, y + r * 0.1, r * 0.92, r * 0.6, 0, 0.15, Math.PI - 0.15); }, null, dark ? shade(PAL.gold, 0.3) : PAL.gold);
      break;
  }
}

/** A cape from the shoulders: it swings with the walk and streams back on a lunge; ragged hem with a trim. */
function cape(p: Pen, f: Pose, b: Build, h: Human, lunge: number): void {
  if (!h.cape) return;
  const sway = f.walking ? f.leg * 3 : (f.breathe - 0.5) * 2;
  const stream = (f.atk === 2 ? -7 : f.atk === 1 ? 2 : 0) + (f.walking ? -4 : 0);
  const top = b.sh + 1 + f.bob;
  const bottom = h.capeLong ? -6 : b.hip + 8;
  const lx = -b.wSh - 9 + stream + sway;
  p.shape((x) => {
    x.moveTo(-b.wSh + 2 + lunge * 0.5, top);
    x.quadraticCurveTo(-b.wSh - 6 + stream * 0.5, (top + bottom) / 2, lx, bottom);
    x.lineTo(lx + 6, bottom - 4);
    x.lineTo(lx + 12, bottom + 1);
    x.lineTo(lx + 18, bottom - 3);
    x.lineTo(b.wSh * 0.3 + sway * 0.4, bottom);
    x.quadraticCurveTo(b.wSh * 0.5, (top + bottom) / 2, b.wSh - 2 + lunge * 0.5, top);
    x.closePath();
  }, h.cape);
  p.line([lx, bottom, lx + 6, bottom - 4, lx + 12, bottom + 1, lx + 18, bottom - 3, b.wSh * 0.3 + sway * 0.4, bottom], h.capeTrim ?? PAL.gold, 1.4);
}

function human(p: Pen, f: Pose, h: Human): void {
  const b: Build = { ...BUILDS[h.build ?? 'slim'] };
  const c = p.c;
  const robe = h.build === 'robe';
  const style = h.style ?? 'melee';
  const sw = f.leg * 10;
  const nearLift = Math.max(0, -f.lift);
  const farLift = Math.max(0, f.lift);
  const lunge = f.follow ? 6 : f.atk === 2 ? 5 : f.atk === 1 ? -3 : f.walking ? 1 : 0;
  cape(p, f, b, h, lunge);
  // legs (planted; the body bobs above them)
  if (h.legs) h.legs(p, f, b);
  else if (robe) {
    p.ell(-6 - sw * 0.8, -3 - farLift * 3, 7, 3.4, h.boots ? shade(h.boots, 0.3) : shade(h.bottom, 0.4));
    p.ell(7 + sw * 0.8, -3 - nearLift * 3, 7, 3.4, h.boots ?? shade(h.bottom, 0.3));
  } else {
    leg(p, -4, b, -sw, farLift, h, true);
    leg(p, 4, b, sw, nearLift, h, false);
  }
  c.save();
  c.translate(lunge, f.bob);
  if (f.walking) { c.translate(0, b.hip); c.rotate(0.04); c.translate(0, -b.hip); }
  h.back?.(p, f, b);
  const pr = b.wSh * 0.48; // pauldron size
  if (h.pauldrons && !h.onePauldron) pauldron(p, -b.wSh + 2, b.sh + 3, pr, h.pauldrons, h.pauldronStyle ?? 'round', true);
  // back arm: shoulder -> elbow -> hand, swinging against the far leg
  const sl = h.sleeve ?? h.top;
  const bx = -b.wSh + 3;
  const by = b.sh + 5;
  const bex = bx - 3 + f.arm * 3;
  const bey = by + 13;
  const bhx = bx - 4 + f.arm * 9;
  const bhy = by + 25 - Math.abs(f.arm) * 2;
  p.limb([bx, by, bex, bey], b.armW, shade(sl, 0.2));
  p.limb([bex, bey, bhx, bhy], b.armW * (h.bracers ? 1.1 : 0.95), h.bracers ? shade(h.bracers, 0.25) : shade(sl, 0.2));
  // torso: a V from broad shoulders to a narrower waist (a flared robe for casters)
  if (robe) {
    p.shape((x) => {
      x.moveTo(-b.wSh, b.sh + 2);
      x.quadraticCurveTo(0, b.sh - 3 - f.breathe, b.wSh, b.sh + 2);
      x.lineTo(b.wHip + f.leg * 1.5, -4);
      x.quadraticCurveTo(0, 0, -b.wHip + f.leg * 1.5, -4);
      x.closePath();
    }, h.top);
    p.line([-b.wHip + 3 + f.leg * 1.5, -2, b.wHip - 3 + f.leg * 1.5, -2], h.skirtTrim ?? PAL.gold, 1.6);
    if (h.skirt) p.shape((x) => { x.moveTo(-4, b.hip + 2); x.lineTo(5, b.hip + 2); x.lineTo(8 + f.leg * 1.5, -3); x.lineTo(-6 + f.leg * 1.5, -3); x.closePath(); }, h.skirt);
  } else {
    p.shape((x) => {
      x.moveTo(-b.wSh, b.sh + 2);
      x.quadraticCurveTo(0, b.sh - 3 - f.breathe, b.wSh, b.sh + 2);
      x.lineTo(b.wHip + 1, b.hip + 2);
      x.quadraticCurveTo(0, b.hip + 5, -b.wHip - 1, b.hip + 2);
      x.closePath();
    }, h.top);
    if (h.build === 'belly') p.ell(5, b.hip - 12, b.wHip + 3, 13 + f.breathe * 0.6, h.top);
    if (h.skirt) {
      p.shape((x) => { x.moveTo(-b.wHip - 2, b.hip); x.lineTo(b.wHip + 2, b.hip); x.lineTo(b.wHip + 5 + f.leg, b.hip + 19); x.lineTo(-b.wHip - 5 + f.leg, b.hip + 19); x.closePath(); }, h.skirt);
      p.line([-b.wHip - 5 + f.leg, b.hip + 18, b.wHip + 5 + f.leg, b.hip + 18], h.skirtTrim ?? PAL.gold, 1.5);
    }
  }
  if (h.chest) {
    p.shape((x) => {
      x.moveTo(-b.wSh + 2, b.sh + 3);
      x.quadraticCurveTo(0, b.sh - 1, b.wSh - 2, b.sh + 3);
      x.lineTo(b.wSh - 4, b.sh + 17);
      x.quadraticCurveTo(0, b.sh + 24, -b.wSh + 4, b.sh + 17);
      x.closePath();
    }, h.chest);
    p.line([-b.wSh + 4, b.sh + 17, 0, b.sh + 22, b.wSh - 4, b.sh + 17], PAL.gold, 1.2);
    p.poly([0, b.sh + 8, 2.6, b.sh + 11, 0, b.sh + 14, -2.6, b.sh + 11], PAL.gold);
  }
  h.torso?.(p, f, b);
  if (h.belt || !robe) {
    const belt = h.belt ?? shade(h.bottom, 0.35);
    p.rrect(-b.wHip - 1.5, b.hip - 3, b.wHip * 2 + 3, 5.5, 1.5, belt);
    p.rrect(-2.5, b.hip - 3.5, 5, 6.5, 1.2, PAL.gold);
  }
  if (h.sash !== false) {
    // team sash, shoulder to hip, with a songket gold edge and a little diamond motif
    p.poly([-b.wSh + 1, b.sh + 4, -b.wSh + 8, b.sh + 1, b.wHip + 1, b.hip - 3, b.wHip - 6, b.hip + 1], f.team.base);
    p.line([-b.wSh + 4.5, b.sh + 2.5, b.wHip - 2.5, b.hip - 1], PAL.gold, 1.1);
    const mx = (-b.wSh + 4.5 + b.wHip - 2.5) / 2;
    const my = (b.sh + 2.5 + b.hip - 1) / 2;
    p.poly([mx, my - 2.2, mx + 2, my, mx, my + 2.2, mx - 2, my], PAL.gold, false);
  }
  // neck and head
  const hx = 2;
  const hy = b.headY - f.breathe * 0.5;
  const r = b.headR;
  p.limb([hx - 1, b.sh + 2, hx, hy + r * 0.7], r * 0.62, shade(h.skin, 0.15), false);
  if (h.head) h.head(p, f, hx, hy, r);
  else {
    if (h.hair) p.circle(hx - 2, hy - 1, r + 1, h.hair);
    p.circle(hx, hy, r, h.skin);
    if (h.hair) p.shape((x) => { x.arc(hx - 1, hy - 1, r + 0.5, Math.PI * 0.95, Math.PI * 1.85); x.quadraticCurveTo(hx + 2, hy - r * 0.35, hx - r * 0.9, hy + r * 0.2); x.closePath(); }, h.hair);
    p.dot(hx + r * 0.95, hy + r * 0.12, r * 0.12, shade(h.skin, 0.3));
    eyes(p, hx, hy + 1, r);
    if (h.mood) mood(p, hx, hy + 1, r, h.mood);
  }
  if (h.eyeGlow) for (const ex of [hx + r * 0.16, hx + r * 0.62]) { p.glow(ex, hy + 1, r * 0.55, h.eyeGlow, 0.85); p.dot(ex, hy + 1, Math.max(1.1, r * 0.12), '#ffffff'); }
  h.hat?.(p, f, hx, hy, r);
  // front arm and prop
  const g = grip(f, style);
  if (f.atk === 2 && !f.follow && style === 'melee') smear(p, b.wSh - 3, b.sh + 5);
  h.front?.(p, f, g, b);
  const sx = b.wSh - 3;
  const sy = b.sh + 5;
  const ex = (sx + g.x) / 2 + 2;
  const ey = (sy + g.y) / 2 + 5;
  p.limb([sx, sy, ex, ey], b.armW, sl);
  p.limb([ex, ey, g.x, g.y], b.armW * (h.bracers ? 1.1 : 0.95), h.bracers ?? sl);
  p.circle(g.x, g.y, b.armW * 0.62, h.skin);
  if (h.pauldrons) pauldron(p, b.wSh - 2, b.sh + 3, pr, h.pauldrons, h.pauldronStyle ?? 'round', false);
  h.over?.(p, f, g, b);
  if (f.atk === 2 && !f.follow) {
    if (style === 'ranged') for (const a of [-0.5, 0, 0.5]) p.line([g.x + 22 + Math.cos(a) * 4, g.y + Math.sin(a) * 4, g.x + 22 + Math.cos(a) * 12, g.y + Math.sin(a) * 12], '#fff6dc', 1.6);
    else if (style === 'hold') p.glow(g.x + 6, g.y - 12, 18, '#fff2c0', 0.75);
  }
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

/** A small team pennant on a pole behind the shoulder (heroes only), so the side reads at a glance. */
interface Pennant { x: number; top: number }

interface HeroArt { draw: (p: Pen, f: Pose) => void; headX: number; headY: number; scale: number; pennant: Pennant | false }

function pennant(p: Pen, f: Pose, at: Pennant): void {
  const x = at.x;
  const t = at.top + f.bob * 0.6;
  const wave = f.walking ? f.leg * 2.2 : f.breathe * 1.6 - 0.8;
  p.limb([x, t + 52, x, t - 1], 2, '#5a3e22');
  p.shape((q) => {
    q.moveTo(x, t);
    q.quadraticCurveTo(x - 10, t + 1 + wave, x - 21, t + 6 + wave);
    q.quadraticCurveTo(x - 11, t + 9 + wave * 0.5, x, t + 13);
    q.closePath();
  }, f.team.base);
  p.line([x - 2, t + 6.5, x - 14, t + 7 + wave * 0.7], PAL.gold, 1.4);
  p.circle(x, t - 2, 2.4, PAL.gold);
}

const humanArt = (h: Human, scale = 1, pennant: Pennant | false = { x: -17, top: -116 }): HeroArt => {
  const b = BUILDS[h.build ?? 'slim'];
  return { draw: (p, f) => human(p, f, h), headX: 2, headY: b.headY, scale, pennant };
};

// --- shared hero parts -------------------------------------------------------------------------

/** Glowing eyes for heads drawn by hand: a soft glow and a bright pupil at each point (x, y pairs). */
function glowEyes(p: Pen, pts: readonly number[], r: number, color: string): void {
  for (let i = 0; i < pts.length; i += 2) {
    p.glow(pts[i], pts[i + 1], r * 3.4, color, 0.9);
    p.dot(pts[i], pts[i + 1], r, '#fffbe8');
  }
}

/** A tube or pole with bands across it (blowpipes, bamboo, hafts). */
function banded(p: Pen, x1: number, y1: number, x2: number, y2: number, w: number, color: string, band: string, n: number): void {
  p.limb([x1, y1, x2, y2], w, color);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w * 0.62;
  const ny = (dx / len) * w * 0.62;
  for (let i = 1; i <= n; i++) {
    const x = x1 + dx * (i / (n + 1));
    const y = y1 + dy * (i / (n + 1));
    p.line([x - nx, y - ny, x + nx, y + ny], band, 1.4);
  }
}

/** A quiver slung on the back, tilted by `a`, with fletched shafts poking out. */
function quiver(p: Pen, x: number, y: number, a: number, color: string, fletch: string): void {
  const c = p.c;
  c.save();
  c.translate(x, y);
  c.rotate(a);
  for (const dx of [-3, 0, 3]) {
    p.line([dx, -14, dx, -24], '#7a5230', 1.4);
    p.poly([dx - 2.2, -21, dx, -28, dx + 2.2, -21], fletch);
  }
  p.rrect(-5.5, -15, 11, 30, 3, color);
  p.line([-5.5, -9, 5.5, -9], PAL.gold, 1.3);
  p.line([-5.5, 9, 5.5, 9], PAL.gold, 1.3);
  c.restore();
}

/** A crescent moon opening forward (+x). */
function crescent(p: Pen, cx: number, cy: number, R: number, color: string): void {
  const phi = Math.PI * 0.3;
  const d = R * 0.5;
  const ix = R * Math.cos(phi) - d;
  const iy = R * Math.sin(phi);
  const R2 = Math.hypot(ix, iy);
  const psi = Math.atan2(-iy, ix);
  p.shape((x) => { x.arc(cx, cy, R, phi, TAU - phi); x.arc(cx + d, cy, R2, psi, -psi, true); x.closePath(); }, color);
}

/** A raindrop (Hujan's rain and pendant). */
function drop(p: Pen, x: number, y: number, s: number, color: string): void {
  p.shape((q) => { q.moveTo(x, y - 4 * s); q.quadraticCurveTo(x + 3.6 * s, y + 1 * s, x, y + 2.6 * s); q.quadraticCurveTo(x - 3.6 * s, y + 1 * s, x, y - 4 * s); q.closePath(); }, color);
}

/** Kail's barbed fishing hook, hanging from its eye at (x, y). */
function hook(p: Pen, x: number, y: number, s: number): void {
  const steel = '#b8c2c8';
  p.circle(x, y - 1.6 * s, 2.2 * s, null, INK);
  p.limb([x, y, x, y + 10 * s], 3.8 * s, steel);
  p.bend(x, y + 10 * s, x, y + 20 * s, x - 10 * s, y + 15 * s, 3.8 * s, steel);
  p.poly([x - 10.5 * s, y + 15.5 * s, x - 14 * s, y + 6.5 * s, x - 6.5 * s, y + 11 * s], steel);
  p.line([x + 0.8 * s, y + 2 * s, x + 0.8 * s, y + 9 * s], '#eef4f6', 1);
}

function tigerHead(p: Pen, hx: number, hy: number, r: number, fur: string, glow: string | null): void {
  // a spiky ruff of pale fur behind the cheeks
  p.shape((x) => {
    x.moveTo(hx + r * 0.55, hy + r * 0.95);
    for (let i = 0; i <= 9; i++) {
      const a = Math.PI * (0.45 + i * 0.1);
      const rr = r * (i % 2 ? 1.1 : 1.45);
      x.lineTo(hx - r * 0.05 + Math.cos(a) * rr, hy + r * 0.15 + Math.sin(a) * rr);
    }
    x.lineTo(hx, hy);
    x.closePath();
  }, '#f4e0c0');
  // ears
  p.shape((x) => { x.moveTo(hx - r * 0.85, hy - r * 0.4); x.lineTo(hx - r * 0.6, hy - r * 1.28); x.lineTo(hx - r * 0.1, hy - r * 0.8); x.closePath(); }, fur);
  p.shape((x) => { x.moveTo(hx + r * 0.2, hy - r * 0.82); x.lineTo(hx + r * 0.62, hy - r * 1.28); x.lineTo(hx + r * 0.9, hy - r * 0.42); x.closePath(); }, fur);
  p.dot(hx - r * 0.55, hy - r * 0.82, r * 0.14, INK);
  p.circle(hx, hy, r, fur);
  // muzzle, stripes, nose and fangs
  p.ell(hx + r * 0.5, hy + r * 0.42, r * 0.62, r * 0.44, '#fbf3df');
  p.line([hx - r * 0.35, hy - r * 0.95, hx - r * 0.12, hy - r * 0.52], INK, r * 0.15);
  p.line([hx + r * 0.05, hy - r * 1.0, hx + r * 0.12, hy - r * 0.55], INK, r * 0.15);
  p.line([hx - r * 0.98, hy - r * 0.05, hx - r * 0.5, hy], INK, r * 0.15);
  p.line([hx - r * 0.95, hy + r * 0.35, hx - r * 0.5, hy + r * 0.3], INK, r * 0.13);
  p.poly([hx + r * 0.84, hy + r * 0.1, hx + r * 1.12, hy + r * 0.1, hx + r * 0.99, hy + r * 0.32], INK);
  p.poly([hx + r * 0.6, hy + r * 0.62, hx + r * 0.69, hy + r * 0.95, hx + r * 0.79, hy + r * 0.62], '#ffffff');
  p.poly([hx + r * 0.9, hy + r * 0.6, hx + r * 0.97, hy + r * 0.9, hx + r * 1.06, hy + r * 0.6], '#ffffff');
  // amber eyes (glowing in the beast form) under a hard brow
  if (glow) glowEyes(p, [hx + r * 0.18, hy - r * 0.18, hx + r * 0.62, hy - r * 0.18], r * 0.13, glow);
  else for (const ex of [hx + r * 0.18, hx + r * 0.62]) { p.dot(ex, hy - r * 0.18, r * 0.17, '#f0b030'); p.dot(ex + r * 0.03, hy - r * 0.18, r * 0.08, INK); }
  p.line([hx + r * 0.0, hy - r * 0.44, hx + r * 0.34, hy - r * 0.32], INK, r * 0.1);
  p.line([hx + r * 0.46, hy - r * 0.32, hx + r * 0.8, hy - r * 0.46], INK, r * 0.1);
}

function stripes(p: Pen, b: Build): void {
  for (let i = 0; i < 3; i++) {
    const y = b.sh + 8 + i * 7;
    p.line([-b.wSh + 3, y, -b.wSh + 9, y + 3], INK, 2.4);
    p.line([b.wSh - 3, y, b.wSh - 9, y + 3], INK, 2.4);
  }
}

/** Belang's beast form: a big armoured tiger with glowing eyes. */
function tigerBeast(p: Pen, f: Pose): void {
  const fur = TIGER;
  const lunge = f.atk === 2 ? 7 : f.atk === 1 ? -4 : 0;
  p.c.save();
  p.c.translate(lunge, f.bob * 0.6 + (f.atk === 1 ? 2 : 0));
  // tail
  const tw = f.walking ? f.leg2 * 6 : (f.breathe - 0.5) * 6;
  p.bend(-30, -44, -54, -62 + tw * 0.5, -46 + tw, -78, 7, fur);
  p.line([-46 + tw, -78, -48 + tw, -72], INK, 4);
  // legs, body and stripes
  quadLegs(p, f, [-22, -16, 20, 25], -34, 11, fur, { far: true });
  p.ell(0, -44 - f.breathe, 36, 18, fur);
  p.ell(5, -34, 24, 7, '#fbf3df', false);
  for (const sx of [-22, -12, -2, 8]) p.line([sx, -61, sx + 4, -48], INK, 3.2);
  quadLegs(p, f, [-22, -16, 20, 25], -34, 11, fur, { near: true });
  // an iron shoulder plate and an armoured collar in team colour with gold studs
  p.shape((x) => { x.moveTo(6, -58); x.quadraticCurveTo(15, -68, 26, -60); x.lineTo(22, -45); x.quadraticCurveTo(14, -47, 7, -50); x.closePath(); }, '#8b8f94');
  p.dot(13, -59, 1.4, '#5a5e64'); p.dot(20, -56, 1.4, '#5a5e64');
  p.shape((x) => { x.moveTo(20, -66); x.quadraticCurveTo(36, -68, 38, -42); x.lineTo(29, -37); x.quadraticCurveTo(28, -57, 16, -58); x.closePath(); }, f.team.base);
  for (const [sx, sy] of [[25, -62], [32, -56], [33, -47]] as const) p.dot(sx, sy, 1.7, PAL.gold);
  tigerHead(p, 43, -59, 16, fur, '#ffd060');
  if (f.atk === 2) for (let i = 0; i < 3; i++) p.line([60, -67 + i * 7, 72, -55 + i * 7], '#ffffff', 2.4);
  p.c.restore();
}

const TIGER = '#e08a2e';

/** Belang standing: tiger-man with one spiked pauldron, claw blades and a striped tail. */
const BELANG: Human = {
  skin: TIGER, top: TIGER, bottom: '#5a3a22', build: 'stocky', style: 'melee',
  pauldrons: '#6b4426', pauldronStyle: 'spiked', onePauldron: true, skirt: PAL.maroon, skirtTrim: PAL.gold,
  belt: '#3a2618', bracers: '#4a2a14',
  torso: (q, _f, b) => {
    q.ell(3, b.sh + 15, 7, 10, '#fbf3df', false);
    stripes(q, b);
  },
  back: (q, f) => {
    const tw = f.walking ? f.leg2 * 4 : (f.breathe - 0.5) * 3;
    q.bend(-12, -34, -38, -32, -34 + tw, -62, 5.5, TIGER);
    q.line([-34 + tw, -62, -35 + tw, -56], INK, 4.6);
    q.line([-28, -38, -24, -42], INK, 2);
  },
  head: (q, _f, hx, hy, r) => tigerHead(q, hx, hy, r, TIGER, null),
  front: (q, ff, g) => {
    for (let i = 0; i < 3; i++) q.bend(g.x + 2, g.y - 3 + i * 3, g.x + 10, g.y - 7 + i * 3.4, g.x + 15, g.y - 1 + i * 3.6, 1.9, '#f4f0e8');
    if (ff.atk === 2 && !ff.follow) for (let i = 0; i < 3; i++) q.line([g.x + 15, g.y - 16 + i * 7, g.x + 25, g.y - 4 + i * 7], '#ffffff', 2.2);
  },
};

/** Embun's ice shards orbiting her waist: the far half is drawn behind her, the near half in front. */
function iceShards(p: Pen, f: Pose, near: boolean): void {
  const turn = f.walking ? f.phase : f.frame >= IDLE0 ? (f.frame - IDLE0) / 4 : 0.12;
  for (let k = 0; k < 3; k++) {
    const a = (turn + k / 3) * TAU;
    if ((Math.sin(a) > 0) !== near) continue;
    const x = Math.cos(a) * 27;
    const y = -52 + Math.sin(a) * 8;
    const s = near ? 1.1 : 0.85;
    p.poly([x, y - 7 * s, x + 2.8 * s, y, x, y + 7 * s, x - 2.8 * s, y], near ? '#e6f8ff' : '#bcdbe8');
  }
}

// --- the twenty heroes (PLAN-014: Dota 2 is the quality bar, not a source; every design is ours) --

const HEROES_ART: Record<HeroKind, HeroArt> = {
  // Rimba: jungle huntress. Deep swept hood, leaf cape, cloth mask, glowing green eyes, a long banded blowpipe.
  rimba: humanArt({
    skin: '#c98a5a', top: '#3f6a34', bottom: '#2e4a2a', style: 'ranged',
    boots: '#4a3a26', bracers: '#6b4a2a', belt: '#4a3020',
    cape: '#2f6a2e', capeTrim: '#8fc05a', capeLong: true,
    pauldrons: '#4f8a3b', pauldronStyle: 'leaf', onePauldron: true,
    back: (p, _f, b) => quiver(p, -b.wSh + 1, b.sh + 14, -0.45, '#7a5230', '#e8dcc0'),
    head: (p, _f, hx, hy, r) => {
      p.shape((x) => {
        x.moveTo(hx - r * 0.95, hy + r * 1.05);
        x.quadraticCurveTo(hx - r * 1.45, hy - r * 0.5, hx - r * 2.2, hy - r * 1.75);
        x.quadraticCurveTo(hx - r * 0.1, hy - r * 1.9, hx + r * 1.1, hy - r * 0.15);
        x.lineTo(hx + r * 0.8, hy + r * 1.05);
        x.closePath();
      }, '#2f5e2c');
      p.ell(hx + r * 0.4, hy + r * 0.15, r * 0.6, r * 0.68, '#c98a5a');
      p.shape((x) => { x.moveTo(hx - r * 0.18, hy + r * 0.28); x.lineTo(hx + r * 1.05, hy + r * 0.2); x.lineTo(hx + r * 0.9, hy + r * 0.8); x.quadraticCurveTo(hx + r * 0.35, hy + r * 1.0, hx - r * 0.15, hy + r * 0.75); x.closePath(); }, '#3a4a2a');
      glowEyes(p, [hx + r * 0.22, hy - r * 0.02, hx + r * 0.68, hy - r * 0.02], r * 0.12, '#a8f07a');
      p.line([hx + r * 0.02, hy - r * 0.32, hx + r * 0.38, hy - r * 0.2], INK, r * 0.1);
      p.line([hx + r * 0.52, hy - r * 0.2, hx + r * 0.88, hy - r * 0.32], INK, r * 0.1);
    },
    front: (p, f, g) => {
      if (f.atk) {
        // at the lips, aimed along the line through the hand
        const mx = 11;
        const my = -77;
        const len = Math.hypot(g.x - mx, g.y - my) || 1;
        banded(p, mx, my, mx + ((g.x - mx) / len) * 60, my + ((g.y - my) / len) * 60, 3.4, '#9a7a42', '#4a3020', 4);
      } else {
        const [x1, y1, x2, y2] = pole(g, 22, 52);
        banded(p, x1, y1, x2, y2, 3.4, '#9a7a42', '#4a3020', 4);
      }
    },
  }),

  // Benteng: the living fort. Battlement helm, stone pauldrons, bronze chest, lamellar skirt, a tower shield with our fort emblem.
  benteng: humanArt({
    skin: '#b07850', top: '#7a5a34', bottom: '#4a3a2a', build: 'stocky', style: 'melee', mood: 'stern',
    chest: '#a8703c', pauldrons: '#9a9ea3', pauldronStyle: 'stone', skirt: '#6d5a3a', skirtTrim: '#9a9ea3',
    bracers: '#8b8f94', boots: '#4a3a2a', belt: '#4a2a14',
    torso: (p, _f, b) => {
      for (const y of [b.hip + 7, b.hip + 13]) for (let x = -b.wHip - 2; x <= b.wHip + 2; x += 4) p.line([x, y - 4, x + 0.5, y + 1], shade('#6d5a3a', 0.35), 1);
    },
    hat: (p, _f, hx, hy, r) => {
      const stone = '#9a9ea3';
      for (const dx of [-r * 0.8, -r * 0.05, r * 0.7]) p.rrect(hx + dx - 3.4, hy - r - 9.5, 7, 10, 1, stone);
      p.shape((x) => { x.arc(hx, hy + 1, r + 2, Math.PI, 0); x.closePath(); }, stone);
      p.limb([hx - r - 2, hy + 1, hx + r + 2, hy + 1], 3.6, '#6d7176');
      p.limb([hx + r * 0.5, hy, hx + r * 0.55, hy + r * 0.62], 2.6, '#6d7176');
      p.poly([hx - r - 2, hy + 1, hx - r * 0.5, hy + 1, hx - r * 0.65, hy + r * 0.85, hx - r - 1.5, hy + r * 0.7], '#8b8f94');
    },
    over: (p, f) => {
      const sx = f.follow ? 27 : f.atk === 2 ? 31 : f.atk === 1 ? 13 : 21;
      const top = f.atk === 1 ? -75 : -71;
      const h = 65;
      p.rrect(sx - 15, top, 30, h, 8, '#b8843a');
      p.rrect(sx - 11, top + 4, 22, h - 8, 5, f.team.base);
      const ey = top + 25;
      p.poly([sx - 7, ey + 12, sx - 7, ey - 5, sx - 4, ey - 5, sx - 4, ey - 2, sx - 1.5, ey - 2, sx - 1.5, ey - 5, sx + 1.5, ey - 5, sx + 1.5, ey - 2, sx + 4, ey - 2, sx + 4, ey - 5, sx + 7, ey - 5, sx + 7, ey + 12], PAL.gold);
      p.shape((x) => { x.moveTo(sx - 2.5, ey + 12); x.lineTo(sx - 2.5, ey + 6); x.quadraticCurveTo(sx, ey + 2.5, sx + 2.5, ey + 6); x.lineTo(sx + 2.5, ey + 12); x.closePath(); }, f.team.dark);
      p.line([sx - 10, top + h - 15, sx + 10, top + h - 15], PAL.gold, 1.6);
      for (const [dx, dy] of [[-12.6, 7], [12.6, 7], [-12.6, h - 8], [12.6, h - 8], [-12.6, h / 2], [12.6, h / 2]] as const) p.dot(sx + dx, top + dy, 1.5, '#6b4426');
    },
  }),

  // Kail: river fisherman. A giant terendak hat, net cape with cork floats, checked sarong, wave tattoo, a big barbed hook on a rope.
  kail: humanArt({
    skin: '#c08458', top: '#4f6f7c', bottom: '#3d5560', build: 'stocky', style: 'melee', mood: 'grin',
    skirt: '#35606e', skirtTrim: '#d8b46a', bracers: '#d8c08a', belt: '#6b4a2a',
    cape: '#6f8466', capeTrim: '#e0b04a',
    torso: (p, _f, b) => {
      p.poly([-3, b.sh + 1, 8, b.sh + 1, 2.5, b.sh + 19], '#c08458', false);
      p.line([-1, b.sh + 8, 1.5, b.sh + 5.5, 4, b.sh + 8, 6.5, b.sh + 5.5], '#2a5a8a', 1.4);
      for (let x = -b.wHip - 1; x <= b.wHip + 3; x += 6) p.line([x, b.hip + 3, x + 1.5, b.hip + 17], shade('#35606e', 0.3), 1.1);
      p.line([-b.wHip - 3, b.hip + 10, b.wHip + 3, b.hip + 10], shade('#35606e', 0.3), 1.1);
    },
    back: (p, _f, b) => {
      // the net over the cape, and a coil of rope at the hip
      const net = shade('#6f8466', 0.35);
      for (let i = 0; i < 3; i++) {
        p.line([-b.wSh - 8 + i * 4, b.sh + 6, -b.wSh - 2 + i * 4, b.hip + 7], net, 1);
        p.line([-b.wSh - 9, b.sh + 10 + i * 8, -b.wSh - 1, b.sh + 6 + i * 8], net, 1);
      }
      p.ell(-b.wHip - 4, b.hip + 3, 7, 8, '#d8c08a');
      p.ell(-b.wHip - 4, b.hip + 3, 3.6, 4.4, shade('#d8c08a', 0.4), false);
      p.line([-b.wHip - 10, b.hip + 1, -b.wHip + 2, b.hip + 5], shade('#d8c08a', 0.3), 1);
    },
    hat: (p, _f, hx, hy, r) => {
      const y0 = hy - r * 0.45;
      p.shape((x) => { x.moveTo(hx - r * 2.5, y0 + 2); x.quadraticCurveTo(hx - r * 1.0, y0 - r * 0.7, hx - r * 0.05, hy - r * 1.65); x.quadraticCurveTo(hx + r * 1.0, y0 - r * 0.7, hx + r * 2.5, y0 + 2); x.quadraticCurveTo(hx, y0 + 5, hx - r * 2.5, y0 + 2); x.closePath(); }, '#d8b46a');
      p.line([hx - r * 1.7, y0 - 1.5, hx + r * 1.7, y0 - 1.5], '#a57a24', 1.4);
      p.line([hx - r * 0.95, y0 - r * 0.6, hx + r * 0.95, y0 - r * 0.6], '#a57a24', 1.2);
      p.line([hx - r * 2.3, y0 + 2.2, hx + r * 2.3, y0 + 2.2], '#7b4a22', 1.6);
      p.circle(hx - r * 0.05, hy - r * 1.68, 2.4, '#7b4a22');
    },
    front: (p, f, g) => {
      let kx: number; let ky: number;
      if (f.atk === 1) { kx = g.x - 30; ky = g.y - 22; } else if (f.atk === 2) { kx = g.x + 34; ky = g.y - 4; } else { kx = g.x + 10; ky = -22; }
      const sag = f.atk ? -6 : 5;
      p.line([g.x, g.y, (g.x + kx) / 2 + (f.atk ? 0 : 5), (g.y + ky) / 2 + sag, kx, ky], '#e2cf9f', 2.2);
      hook(p, kx, ky, 1.5);
    },
  }),

  // Seri: of the hidden folk. A glowing veil and cape, a gold tiara, songket bands, gold eyes, an ornate floating lantern.
  seri: humanArt({
    skin: '#f0d0b0', top: '#f4ecd0', bottom: '#e2cf9f', build: 'robe', style: 'hold', hair: '#2a1d18', mood: 'calm',
    cape: 'rgba(255,250,232,0.78)', capeTrim: '#f6d77a', capeLong: true, eyeGlow: '#ffd76a', skirtTrim: PAL.gold,
    back: (p) => p.glow(0, -58, 58, '#ffe9a8', 0.5),
    torso: (p, _f, b) => {
      for (const [y, w] of [[b.sh + 12, 12], [-16, 15]] as const) {
        p.limb([-w, y, w, y], 3.6, PAL.gold, false);
        for (let x = -w + 3; x < w; x += 5) p.poly([x, y - 1.5, x + 1.5, y, x, y + 1.5, x - 1.5, y], PAL.maroon, false);
      }
    },
    hat: (p, f, hx, hy, r) => {
      const s = f.walking ? f.leg * 1.5 : 0;
      p.shape((x) => { x.moveTo(hx - r * 0.2, hy - r * 1.0); x.quadraticCurveTo(hx - r * 1.6, hy - r * 0.6, hx - r * 1.9 + s, hy + r * 2.0); x.lineTo(hx - r * 0.9, hy + r * 1.5); x.quadraticCurveTo(hx - r * 1.0, hy, hx - r * 0.2, hy - r * 1.0); x.closePath(); }, 'rgba(255,255,255,0.72)', 'rgba(29,20,14,0.5)');
      const ty = hy - r * 0.78;
      p.poly([hx - r * 0.75, ty + 2, hx - r * 0.55, ty - 3, hx - r * 0.25, ty, hx + r * 0.1, ty - 7.5, hx + r * 0.45, ty, hx + r * 0.75, ty - 3, hx + r * 0.9, ty + 2.5, hx + r * 0.1, ty + 0.5], PAL.gold);
      p.dot(hx + r * 0.1, ty - 2.2, 1.8, '#9fe8ff');
    },
    front: (p, f, g) => {
      const lx = g.x + 13;
      const ly = g.y - 18 - f.breathe * 2.5 + (f.walking ? f.leg2 * 1.5 : 0) - (f.atk === 2 ? 6 : 0);
      p.glow(lx, ly, f.atk === 2 ? 30 : 22, '#ffd76a', 0.85);
      p.line([g.x, g.y, lx, ly - 11], 'rgba(224,176,74,0.85)', 1);
      p.poly([lx - 8.5, ly - 7, lx, ly - 15.5, lx + 8.5, ly - 7], PAL.gold);
      p.rrect(lx - 6.5, ly - 7, 13, 15, 2.5, '#f6c74a');
      p.line([lx - 2, ly - 6, lx - 2, ly + 7], '#c98a2a', 1);
      p.line([lx + 2, ly - 6, lx + 2, ly + 7], '#c98a2a', 1);
      p.dot(lx, ly, 3.4, '#fffbe0');
      p.rrect(lx - 7.5, ly + 7, 15, 3, 1, PAL.gold);
      p.line([lx, ly + 10, lx, ly + 17], PAL.maroon, 1.6);
      p.circle(lx, ly + 18, 1.7, PAL.maroon);
    },
  }),

  // Belang: tiger-man; at level 4 a full armoured tiger.
  belang: {
    headX: 2, headY: BUILDS.stocky.headY, scale: 1.05, pennant: { x: -17, top: -116 },
    draw: (p, f) => {
      if (f.transformed) { tigerBeast(p, f); return; }
      human(p, f, BELANG);
    },
  },

  // Gergasi: the hunched giant. Curling horns, tusks, ember eyes, a fur pauldron, a chain across the chest, an iron-banded spiked club.
  gergasi: humanArt({
    skin: '#8a5a3a', top: '#8a5a3a', bottom: '#5a3e22', build: 'giant', style: 'melee', sleeve: '#8a5a3a',
    pauldrons: '#6b5a40', pauldronStyle: 'spiked', onePauldron: true, bracers: '#4f555a', belt: '#3a2618',
    skirt: '#5a3e22', skirtTrim: '#e8dcc0',
    torso: (p, _f, b) => {
      p.line([-b.wSh + 7, b.sh + 13, -3, b.sh + 17], shade('#8a5a3a', 0.35), 2);
      p.line([b.wSh - 7, b.sh + 13, 3, b.sh + 17], shade('#8a5a3a', 0.35), 2);
      p.line([-6, b.hip - 14, 2, b.hip - 8], shade('#8a5a3a', 0.4), 1.4);
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        p.ell(b.wSh - 5 - t * (b.wSh + b.wHip - 8), b.sh + 6 + t * (b.hip - b.sh - 10), 2.8, 1.9, '#9aa0a6', true, i % 2 ? 0.7 : -0.5);
      }
    },
    head: (p, _f, hx, hy, r) => {
      p.shape((x) => { x.moveTo(hx - r * 0.7, hy - r * 0.55); x.quadraticCurveTo(hx - r * 1.9, hy - r * 1.1, hx - r * 1.5, hy - r * 2.5); x.quadraticCurveTo(hx - r * 1.2, hy - r * 1.4, hx - r * 0.15, hy - r * 0.9); x.closePath(); }, '#e8dcc0');
      p.shape((x) => { x.moveTo(hx + r * 0.1, hy - r * 0.9); x.quadraticCurveTo(hx + r * 0.4, hy - r * 2.2, hx + r * 1.45, hy - r * 2.6); x.quadraticCurveTo(hx + r * 0.9, hy - r * 1.6, hx + r * 0.8, hy - r * 0.6); x.closePath(); }, '#e8dcc0');
      p.poly([hx - r * 1.15, hy + r * 0.4, hx - r * 1.55, hy - r * 0.1, hx - r * 1.1, hy - r * 0.4, hx - r * 1.35, hy - r * 0.85, hx - r * 0.5, hy - r * 0.9, hx, hy], '#3a2618');
      p.circle(hx, hy, r, '#8a5a3a');
      p.limb([hx - r * 0.25, hy - r * 0.34, hx + r * 0.98, hy - r * 0.42], r * 0.3, shade('#8a5a3a', 0.3));
      glowEyes(p, [hx + r * 0.15, hy - r * 0.06, hx + r * 0.62, hy - r * 0.06], r * 0.12, '#ff7a3a');
      p.ell(hx + r * 0.88, hy + r * 0.22, r * 0.25, r * 0.2, shade('#8a5a3a', 0.25));
      p.poly([hx + r * 0.2, hy + r * 0.72, hx + r * 0.1, hy + r * 0.02, hx + r * 0.42, hy + r * 0.64], '#fbf3df');
      p.poly([hx + r * 0.72, hy + r * 0.72, hx + r * 0.76, hy - r * 0.02, hx + r * 1.0, hy + r * 0.64], '#fbf3df');
    },
    front: (p, f, g) => {
      if (f.bust) return; // the club would hide his face in a portrait
      const dx = Math.cos(g.a);
      const dy = Math.sin(g.a);
      const at = (t: number): [number, number] => [g.x + dx * t, g.y + dy * t];
      const [x1, y1] = at(-14);
      const [mx, my] = at(20);
      const [x2, y2] = at(62);
      for (const t of [30, 42, 54]) for (const s of [-1, 1]) {
        const [cx, cy] = at(t);
        p.poly([cx - dy * s * 6 - dx * 2.4, cy + dx * s * 6 - dy * 2.4, cx - dy * s * 12.5, cy + dx * s * 12.5, cx - dy * s * 6 + dx * 2.4, cy + dx * s * 6 + dy * 2.4], '#d8dde0');
      }
      p.limb([x1, y1, mx, my], 7, '#7a5230');
      p.limb([mx, my, x2, y2], 14, '#8a5a32');
      for (const t of [24, 58]) { const [cx, cy] = at(t); p.line([cx + dy * 7.5, cy - dx * 7.5, cx - dy * 7.5, cy + dx * 7.5], '#4f555a', 2.6); }
      p.circle(x2, y2, 7, '#8a5a32');
      p.line([x1 + dy * 2, y1 - dx * 2, x1 + dx * 10 + dy * 2, y1 + dy * 10 - dx * 2], '#3a2618', 1.2);
    },
  }, 1.25),

  // Dalang: the shadow puppeteer. A tall swept headdress, high collar, indigo robe with gold perforated trim, violet eyes, a puppet on glowing strings.
  dalang: humanArt({
    skin: '#b07850', top: '#2c2a4a', bottom: '#1f1a33', build: 'robe', style: 'hold', mood: 'sly', eyeGlow: '#c49cff', skirtTrim: PAL.gold,
    back: (p, f) => {
      const s = f.walking ? f.leg * 2 : (f.breathe - 0.5) * 3;
      p.c.save();
      p.c.globalAlpha *= 0.6;
      p.shape((x) => { x.moveTo(-18, -2); x.quadraticCurveTo(-36, -20 + s, -25, -42); x.quadraticCurveTo(-28, -24, -12, -12); x.closePath(); }, '#4a2a6a', false);
      p.shape((x) => { x.moveTo(14, -2); x.quadraticCurveTo(32, -16 - s, 25, -34); x.quadraticCurveTo(22, -18, 8, -10); x.closePath(); }, '#4a2a6a', false);
      p.c.restore();
    },
    torso: (p, _f, b) => {
      p.poly([-b.wSh + 2, b.sh + 3, -b.wSh - 3, b.sh - 24, -3, b.sh - 2], '#3a3660');
      p.poly([b.wSh - 3, b.sh + 3, b.wSh + 3, b.sh - 22, 6, b.sh - 2], '#3a3660');
      p.line([-b.wSh - 3, b.sh - 24, -3, b.sh - 2], PAL.gold, 1);
      p.line([b.wSh + 3, b.sh - 22, 6, b.sh - 2], PAL.gold, 1);
      p.line([2, b.sh + 4, 3, -5], PAL.gold, 1);
      p.line([7, b.sh + 4, 8, -5], PAL.gold, 1);
      for (let y = b.sh + 8; y < -6; y += 5) p.dot(5, y, 1.1, PAL.gold);
    },
    hat: (p, _f, hx, hy, r) => {
      p.shape((x) => { x.moveTo(hx - r * 1.0, hy - r * 0.25); x.quadraticCurveTo(hx - r * 1.1, hy - r * 1.6, hx - r * 0.9, hy - r * 3.0); x.quadraticCurveTo(hx + r * 0.3, hy - r * 1.9, hx + r * 1.0, hy - r * 0.25); x.closePath(); }, '#2c2a4a');
      p.limb([hx - r * 1.0, hy - r * 0.42, hx + r * 1.0, hy - r * 0.42], 3.2, PAL.gold);
      for (const [dx, dy] of [[-0.45, -1.1], [-0.3, -1.5], [-0.6, -1.9], [-0.1, -0.95], [-0.75, -2.4]] as const) p.dot(hx + r * dx, hy + r * dy, 1.2, PAL.gold);
      p.poly([hx - r * 0.05, hy - r * 1.0, hx + r * 0.2, hy - r * 0.7, hx - r * 0.05, hy - r * 0.42, hx - r * 0.3, hy - r * 0.7], '#b98cff');
    },
    front: (p, f, g) => {
      const tx = g.x + (f.atk === 2 ? 20 : 10);
      const ty = -98 + (g.y + 50) * 0.3 - (f.atk === 1 ? 3 : 0);
      p.glow(tx + 2, ty + 4, 28, '#9a6ad8', 0.32);
      p.line([g.x, g.y + 4, tx, ty + 42], '#5a3e22', 2.2);
      p.shape((x) => {
        x.moveTo(tx - 3, ty - 22); x.lineTo(tx + 3, ty - 33); x.lineTo(tx + 7, ty - 21);
        x.quadraticCurveTo(tx + 15, ty - 18, tx + 16, ty - 12); x.lineTo(tx + 7, ty - 11);
        x.lineTo(tx + 10, ty + 12); x.lineTo(tx + 13, ty + 38); x.lineTo(tx - 10, ty + 38);
        x.lineTo(tx - 7, ty + 8); x.lineTo(tx - 5, ty - 12); x.closePath();
      }, '#c08a3a');
      for (const y of [6, 15, 24, 32]) p.dot(tx + 1, ty + y, 1.6, INK);
      p.dot(tx + 6, ty - 16, 1.6, INK);
      p.line([tx + 7, ty - 2, tx + 22, ty + 10], INK, 1.6);
      p.line([g.x + 2, g.y - 2, tx + 22, ty + 10], 'rgba(196,156,255,0.95)', 1.2);
      p.line([g.x + 3, g.y - 4, tx + 2, ty - 30], 'rgba(196,156,255,0.95)', 1.2);
    },
  }),

  // Senja: dusk serpent mage. A tall swept hat tipped with a gold crescent, a serpent draped on the shoulders, a staff with a glowing orb.
  senja: humanArt({
    skin: '#c89070', top: '#5a3480', bottom: '#3e2460', build: 'robe', style: 'hold', mood: 'sly', eyeGlow: '#ffb060', skirtTrim: '#e8873a',
    torso: (p, f, b) => {
      p.line([-14, -11, 14, -11], '#e8873a', 3);
      const sn = '#5e8a3a';
      p.bend(-b.wSh + 1, b.sh + 24, -b.wSh + 1, b.sh - 4, 2, b.sh - 1, 5, sn);
      p.bend(2, b.sh - 1, 10, b.sh + 4, 6, b.sh + 14, 5, sn);
      p.ell(8, b.sh + 17, 4.6, 3.4, sn, true, 0.6);
      p.dot(9.5, b.sh + 16, 1.1, '#f0d040');
      if (f.atk) p.line([11, b.sh + 19, 14, b.sh + 22, 16, b.sh + 20], '#c0392b', 1);
    },
    hat: (p, _f, hx, hy, r) => {
      p.shape((x) => { x.moveTo(hx - r * 1.35, hy - r * 0.3); x.quadraticCurveTo(hx - r * 0.2, hy - r * 1.3, hx - r * 1.2, hy - r * 2.7); x.quadraticCurveTo(hx + r * 0.6, hy - r * 1.4, hx + r * 1.35, hy - r * 0.3); x.closePath(); }, '#5a3480');
      p.limb([hx - r * 1.3, hy - r * 0.42, hx + r * 1.3, hy - r * 0.42], 3.2, '#e8873a');
      crescent(p, hx - r * 1.15, hy - r * 2.95, r * 0.6, PAL.gold);
    },
    front: (p, f, g) => {
      const [x1, y1, x2, y2] = pole(g, 40, 46);
      p.limb([x1, y1, x2, y2], 3.6, '#4a2a5a');
      p.glow(x2, y2 - 8, f.atk ? 22 : 14, '#ff9a4a', 0.85);
      p.bend(x2 - 7, y2 - 12, x2, y2 + 5, x2 + 7, y2 - 12, 2.6, PAL.gold);
      p.circle(x2, y2 - 8, 5, '#ffb070');
      p.dot(x2 - 1.5, y2 - 9.5, 1.6, '#fff4dc');
    },
  }),

  // Hujan: the rain caller. A big saffron oil-paper umbrella with gold ribs, a cloud cape, a water-drop pendant.
  hujan: humanArt({
    skin: '#c08458', top: '#3d6fb0', bottom: '#2a4a80', build: 'robe', style: 'hold', hair: '#1d140e', mood: 'calm', skirtTrim: '#9cc8ec',
    cape: '#e6eef6', capeTrim: '#9cc8ec',
    torso: (p, _f, b) => {
      p.line([-14, -12, 14, -12], '#9cc8ec', 2.6);
      p.line([-5, b.sh + 2, 2, b.sh + 11, 9, b.sh + 2], PAL.gold, 1);
      drop(p, 2, b.sh + 15, 1.2, '#5ab4ec');
    },
    front: (p, f, g) => {
      const tilt = f.atk === 2 ? 12 : f.atk === 1 ? 5 : 0;
      const tx = g.x - 10 + tilt;
      const ty = -110 - (f.atk === 1 ? 3 : 0);
      const W = 42;
      p.line([g.x, g.y + 5, tx, ty + 4], '#5a3e22', 2.6);
      p.shape((x) => { x.moveTo(tx - W, ty + 11); x.quadraticCurveTo(tx - W + 6, ty - 13, tx, ty - 16); x.quadraticCurveTo(tx + W - 6, ty - 13, tx + W, ty + 11); x.quadraticCurveTo(tx, ty + 3, tx - W, ty + 11); x.closePath(); }, '#d9862e');
      for (const k of [-0.95, -0.5, 0, 0.5, 0.95]) p.line([tx, ty - 15, tx + W * k, ty + (Math.abs(k) > 0.8 ? 10 : 6)], '#a8601e', 1.1);
      p.bend(tx - W * 0.66, ty + 1, tx, ty - 9, tx + W * 0.66, ty + 1, 3, '#f4e0b0', false);
      for (const k of [-0.75, -0.3, 0.3, 0.75]) p.dot(tx + W * k * 0.82, ty + (Math.abs(k) > 0.5 ? 1.5 : -3.5), 1.7, '#2a8496');
      p.circle(tx, ty - 17, 2.4, PAL.gold);
      const fall = (f.frame % 4) * 2.5;
      drop(p, tx - W, ty + 20 + fall, 1, '#7ec3ef');
      drop(p, tx + W, ty + 24 - fall, 1, '#7ec3ef');
      drop(p, tx + W - 8, ty + 36 + fall, 1, '#7ec3ef');
      drop(p, tx - W + 7, ty + 38 - fall, 1, '#7ec3ef');
    },
  }, 1, { x: -30, top: -96 }),

  // Layang: rides a great moon kite with gold cut-work; the rider wears goggles and a long scarf.
  layang: {
    headX: 14, headY: -88, scale: 1.05, pennant: false,
    draw: (p, f) => {
      const c = p.c;
      c.save();
      c.translate(0, f.bob * 0.8 + (f.atk === 2 ? 6 : 0) - f.breathe * 2);
      if (f.atk === 2) c.rotate(f.follow ? 0.1 : 0.18);
      else c.rotate(f.walking ? f.leg * 0.035 : (f.breathe - 0.5) * 0.04);
      const cream = '#f3e6c4';
      const teal = '#2a8496';
      // long ribbon tails in team colour, with gold tassels
      p.bend(-6, -36, -20, -16 + f.leg * 5, -36, -6, 3.2, f.team.base);
      p.bend(2, -36, -4, -12 - f.leg * 5, -14, 2, 3.2, f.team.base);
      p.circle(-36, -6, 2.2, PAL.gold);
      p.circle(-14, 2, 2.2, PAL.gold);
      // crescent tail
      p.shape((x) => { x.moveTo(-38, -50); x.quadraticCurveTo(0, -18, 38, -50); x.quadraticCurveTo(0, -32, -38, -50); x.closePath(); }, cream);
      p.line([-24, -40, 0, -31, 24, -40], teal, 1.6);
      // wings with notched tips, teal bands, gold leaf cut-work
      p.shape((x) => {
        x.moveTo(0, -74); x.quadraticCurveTo(-50, -84, -52, -60); x.lineTo(-46, -62); x.lineTo(-44, -56);
        x.quadraticCurveTo(-24, -56, 0, -52); x.quadraticCurveTo(24, -56, 44, -56); x.lineTo(46, -62); x.lineTo(52, -60);
        x.quadraticCurveTo(50, -84, 0, -74); x.closePath();
      }, cream);
      p.line([-42, -64, -10, -64], teal, 2.6);
      p.line([10, -64, 42, -64], teal, 2.6);
      for (const s of [-1, 1]) {
        p.ell(s * 26, -71, 4.6, 2.4, PAL.gold, true, s * 0.3);
        p.dot(s * 38, -70.5, 1.8, PAL.maroon);
        p.dot(s * 14, -71, 1.8, PAL.maroon);
      }
      // the humming bow over the wings, and the spine
      p.arcLine(0, -60, 34, -2.42, -0.72, 1.2, '#7b4a22');
      p.limb([0, -100, 0, -38], 3, '#93643b');
      // rider lying along the spine
      p.limb([-16, -77, 12, -83], 9.5, '#4a5f98');
      p.limb([-16, -75, -28, -71], 6.5, '#3f2717');
      p.ell(-30, -70, 3.6, 2.6, '#2a1d18');
      p.bend(4, -88, -14, -100 - f.leg * 3, -36, -94 + f.leg * 4, 4, f.team.base);
      p.limb([8, -80, 23, -76], 4.5, '#4a5f98');
      p.circle(24, -76, 3, '#c08458');
      p.circle(14, -86, 11, '#c08458');
      p.shape((x) => { x.arc(14, -86, 11.5, Math.PI * 1.0, Math.PI * 1.9); x.closePath(); }, '#3f2717');
      p.limb([4, -92, 25, -91], 2.2, '#4a2a14');
      p.circle(15.5, -92.5, 3.7, '#7ed0e0', PAL.goldDark);
      p.circle(22.5, -92, 3.7, '#7ed0e0', PAL.goldDark);
      eyes(p, 14, -84, 10);
      c.restore();
    },
  },

  // Pendekar: the silat master. A tall-peaked tanjak, songket samping, gold bengkung belt, arm wraps, a big wavy keris.
  pendekar: humanArt({
    skin: '#b8794c', top: '#1f1a1a', bottom: '#1f1a1a', style: 'melee', mood: 'fierce',
    skirt: PAL.maroon, skirtTrim: PAL.gold, belt: '#c9a040', bracers: '#e8dcc0',
    torso: (p, _f, b) => {
      const zig: number[] = [];
      for (let i = 0, x = -b.wHip - 3; x <= b.wHip + 4; x += 3, i++) zig.push(x, b.hip + 10 + (i % 2 ? -2.5 : 2.5));
      p.line(zig, PAL.gold, 1.2);
      for (const y of [b.sh + 7, b.sh + 13, b.sh + 19]) p.dot(3, y, 1.1, PAL.gold);
      p.limb([-3, b.hip - 1, 8, b.hip + 11], 3.2, '#7b4a22');
      p.ell(-4, b.hip - 2.5, 4.8, 2.3, '#a8703c', true, -0.5);
    },
    hat: (p, _f, hx, hy, r) => {
      p.shape((x) => { x.moveTo(hx - r * 0.75, hy - r * 0.85); x.quadraticCurveTo(hx - r * 1.4, hy - r * 1.7, hx - r * 1.1, hy - r * 2.6); x.quadraticCurveTo(hx - r * 0.45, hy - r * 1.6, hx + r * 0.15, hy - r * 1.02); x.closePath(); }, PAL.maroon);
      p.shape((x) => { x.moveTo(hx - r * 1.08, hy - r * 0.05); x.quadraticCurveTo(hx - r * 1.0, hy - r * 1.05, hx + r * 0.2, hy - r * 1.08); x.lineTo(hx + r * 1.08, hy - r * 0.25); x.closePath(); }, PAL.maroon);
      p.line([hx - r * 1.0, hy - r * 0.35, hx + r * 1.0, hy - r * 0.35], PAL.gold, 1.8);
      p.line([hx - r * 0.72, hy - r * 0.98, hx - r * 1.05, hy - r * 2.35], PAL.gold, 1.2);
    },
    front: (p, _f, g) => {
      const dx = Math.cos(g.a);
      const dy = Math.sin(g.a);
      const nx = -dy;
      const ny = dx;
      const pts: number[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = 4 + i * 4.4;
        const wob = i === 8 ? 0 : (i % 2 ? 2 : -2);
        pts.push(g.x + dx * t + nx * wob, g.y + dy * t + ny * wob);
      }
      p.limb(pts, 3.4, '#d8dde0');
      p.line(pts, '#9aa4ab', 0.9);
      p.limb([g.x + dx * 4 - nx * 4, g.y + dy * 4 - ny * 4, g.x + dx * 4 + nx * 6, g.y + dy * 4 + ny * 6], 3, PAL.gold);
      p.bend(g.x + dx * 3, g.y + dy * 3, g.x - dx * 4 + nx * 2, g.y - dy * 4 + ny * 2, g.x - dx * 6 + nx * 6, g.y - dy * 6 + ny * 6, 3.8, '#7b4a22');
    },
  }),

  // Pelanduk: the clever mousedeer. A hooded short cape with the ears through it, a satchel, a quick little dagger.
  pelanduk: humanArt({
    skin: '#b07a45', top: '#8a6a48', bottom: '#6b4a2a', style: 'melee', belt: '#4a2a14', cape: '#5a3e6a', capeTrim: PAL.gold,
    torso: (p, _f, b) => {
      p.ell(4, b.sh + 14, 6, 9, '#fbf3df', false);
      p.line([b.wSh - 3, b.sh + 3, -b.wHip, b.hip - 2], '#5a3e22', 2);
    },
    back: (p, _f, b) => {
      p.rrect(-b.wHip - 9, b.hip - 7, 10, 9, 2.5, '#7b4a22');
      p.ell(-b.wHip - 3, b.hip + 7, 5, 4, '#fbf3df');
    },
    head: (p, f, hx, hy, r) => {
      const tw = f.walking ? f.leg * 0.08 : f.breathe * 0.1;
      p.circle(hx - r * 0.2, hy - r * 0.05, r, '#5a3e6a');
      p.ell(hx - r * 0.62, hy - r * 1.35, r * 0.34, r * 0.95, '#b07a45', true, -0.35 - tw);
      p.ell(hx - r * 0.62, hy - r * 1.3, r * 0.15, r * 0.62, '#e9b8a0', false, -0.35 - tw);
      p.ell(hx + r * 0.08, hy - r * 1.42, r * 0.32, r * 0.92, '#b07a45', true, 0.15 + tw);
      p.ell(hx + r * 0.08, hy - r * 1.37, r * 0.14, r * 0.6, '#e9b8a0', false, 0.15 + tw);
      p.line([hx - r * 1.05, hy + r * 0.35, hx - r * 0.85, hy - r * 0.55, hx - r * 0.25, hy - r * 0.98], PAL.gold, 1.1);
      p.circle(hx + r * 0.12, hy + r * 0.08, r * 0.76, '#b07a45');
      p.ell(hx + r * 0.8, hy + r * 0.35, r * 0.55, r * 0.38, '#c99060');
      p.dot(hx + r * 1.25, hy + r * 0.26, r * 0.13, INK);
      p.dot(hx + r * 0.34, hy - r * 0.02, r * 0.2, INK);
      p.dot(hx + r * 0.28, hy - r * 0.1, r * 0.08, '#ffffff');
      p.line([hx + r * 0.12, hy - r * 0.32, hx + r * 0.38, hy - r * 0.42, hx + r * 0.55, hy - r * 0.3], INK, Math.max(1.1, r * 0.08));
      p.line([hx + r * 0.95, hy + r * 0.58, hx + r * 1.15, hy + r * 0.62, hx + r * 1.3, hy + r * 0.48], INK, Math.max(1, r * 0.07));
    },
    front: (p, _f, g) => {
      const dx = Math.cos(g.a);
      const dy = Math.sin(g.a);
      p.poly([g.x + dx * 3 - dy * 2.2, g.y + dy * 3 + dx * 2.2, g.x + dx * 18, g.y + dy * 18, g.x + dx * 3 + dy * 2.2, g.y + dy * 3 - dx * 2.2], '#d8dde0');
      p.limb([g.x + dx * 2 - dy * 4, g.y + dy * 2 + dx * 4, g.x + dx * 2 + dy * 4, g.y + dy * 2 - dx * 4], 2, PAL.gold);
    },
  }, 0.8),

  // Saudagar: the spice trader. A jewelled turban with a plume, a brocade coat, a tall pack with a balance, a coin purse.
  saudagar: humanArt({
    skin: '#c08458', top: '#2a6a5a', bottom: '#5a3e22', build: 'belly', style: 'hold',
    belt: '#d9a63a', boots: '#6b3a1e',
    torso: (p, _f, b) => {
      p.line([4, b.sh + 2, 6, b.hip + 1], PAL.gold, 1.6);
      for (const y of [b.sh + 8, b.sh + 14, b.sh + 20]) p.dot(8.5, y, 1.3, PAL.gold);
      for (const [x, y] of [[-8, b.sh + 10], [-4, b.sh + 20], [13, b.hip - 8], [-10, b.hip - 10]] as const) p.poly([x, y - 2, x + 1.6, y, x, y + 2, x - 1.6, y], tint('#2a6a5a', 0.35), false);
    },
    back: (p, _f, b) => {
      const x0 = -b.wSh - 14;
      p.rrect(x0, b.sh - 14, 18, 40, 3, '#93643b');
      p.line([x0, b.sh + 2, x0 + 18, b.sh + 2], '#5a3e22', 1.5);
      p.line([x0, b.sh + 14, x0 + 18, b.sh + 14], '#5a3e22', 1.5);
      p.ell(x0 + 9, b.sh - 20, 10, 8, '#d8c08a');
      p.limb([x0 + 6, b.sh - 27, x0 + 11, b.sh - 26], 2, '#7b4a22');
      p.ell(x0 + 16, b.sh - 29, 6, 6, '#b8955a');
      const sx = x0 - 2;
      const sy = b.sh - 4;
      p.line([sx, sy, sx, sy + 12], PAL.goldDark, 1.4);
      p.line([sx - 8, sy + 12, sx + 6, sy + 12], PAL.goldDark, 1.6);
      for (const px of [sx - 8, sx + 6]) {
        p.line([px - 3, sy + 20, px, sy + 12, px + 3, sy + 20], PAL.goldDark, 0.9);
        p.ell(px, sy + 20.5, 4, 1.6, PAL.gold);
      }
    },
    hat: (p, _f, hx, hy, r) => {
      p.ell(hx - r * 0.1, hy - r * 0.95, r * 1.25, r * 0.7, '#efe0b8');
      p.line([hx - r * 1.2, hy - r * 0.75, hx + r * 1.0, hy - r * 1.3], '#c9b07a', 1.4);
      p.line([hx - r * 1.15, hy - r * 1.1, hx + r * 0.95, hy - r * 0.62], '#c9b07a', 1.2);
      p.bend(hx + r * 0.45, hy - r * 1.2, hx + r * 0.2, hy - r * 2.4, hx - r * 0.6, hy - r * 2.55, 3.2, '#f4f0e8');
      p.circle(hx + r * 0.55, hy - r * 0.98, 3.6, PAL.gold);
      p.dot(hx + r * 0.55, hy - r * 0.98, 2.2, '#2fb08a');
    },
    head: (p, _f, hx, hy, r) => {
      p.circle(hx, hy, r, '#c08458');
      p.dot(hx + r * 0.95, hy + r * 0.12, r * 0.12, shade('#c08458', 0.3));
      eyes(p, hx, hy - 1, r);
      p.poly([hx + r * 0.25, hy + r * 0.62, hx + r * 0.52, hy + r * 1.3, hx + r * 0.8, hy + r * 0.62], '#1d140e', false);
      p.shape((x) => { x.moveTo(hx + r * 0.0, hy + r * 0.42); x.quadraticCurveTo(hx + r * 0.45, hy + r * 0.18, hx + r * 0.95, hy + r * 0.42); x.quadraticCurveTo(hx + r * 0.45, hy + r * 0.56, hx + r * 0.0, hy + r * 0.42); x.closePath(); }, '#1d140e', false);
    },
    front: (p, f, g) => {
      p.ell(g.x + 4, g.y + 7, 8, 9, '#6a3f8c');
      p.line([g.x - 1, g.y, g.x + 9, g.y], PAL.gold, 1.8);
      p.dot(g.x + 4, g.y + 8, 1.6, PAL.gold);
      if (f.atk) { p.circle(g.x + 15, g.y - 10, 3.2, PAL.gold); p.circle(g.x + 23, g.y - 4, 3.2, PAL.gold); p.circle(g.x + 19, g.y - 16, 2.6, PAL.gold); }
    },
  }),

  // Badak: the rhino warrior. A riveted iron brow plate, a great horn, spiked pauldrons, a plate chest, a war hammer.
  badak: humanArt({
    skin: '#8c8a86', top: '#6a5a48', bottom: '#4a4038', build: 'stocky', style: 'melee', sleeve: '#8c8a86',
    pauldrons: '#5a5e64', pauldronStyle: 'spiked', chest: '#7a7e84', skirt: '#4a4038', skirtTrim: '#9a9ea3',
    bracers: '#5a5e64', boots: '#3a3632', belt: '#3a2618',
    torso: (p, _f, b) => { for (const y of [b.hip + 7, b.hip + 13]) p.line([-b.wHip - 2, y, b.wHip + 2, y], '#3a3632', 1.4); },
    head: (p, f, hx, hy, r) => {
      const dip = f.atk === 2 ? 4 : 0;
      p.ell(hx - r * 0.6, hy - r * 0.85, r * 0.28, r * 0.45, '#8c8a86');
      p.ell(hx + r * 0.3, hy + dip, r * 1.3, r * 0.95, '#8c8a86');
      p.poly([hx + r * 0.95, hy - r * 0.3 + dip, hx + r * 1.25, hy - r * 1.85 + dip, hx + r * 1.6, hy - r * 0.15 + dip], '#e8dcc0');
      p.poly([hx + r * 0.42, hy - r * 0.62 + dip, hx + r * 0.6, hy - r * 1.15 + dip, hx + r * 0.8, hy - r * 0.52 + dip], '#e8dcc0');
      p.shape((x) => { x.moveTo(hx - r * 0.85, hy - r * 0.15 + dip); x.quadraticCurveTo(hx - r * 0.3, hy - r * 1.15 + dip, hx + r * 0.62, hy - r * 0.72 + dip); x.lineTo(hx + r * 0.72, hy - r * 0.3 + dip); x.quadraticCurveTo(hx - r * 0.05, hy - r * 0.55 + dip, hx - r * 0.85, hy - r * 0.15 + dip); x.closePath(); }, '#5a5e64');
      for (const t of [-0.55, -0.15, 0.3]) p.dot(hx + r * t, hy - r * (0.62 + t * 0.12) + dip, 1, '#c9ccd0');
      p.dot(hx + r * 0.18, hy - r * 0.08 + dip, r * 0.15, INK);
      p.dot(hx + r * 0.15, hy - r * 0.13 + dip, r * 0.06, '#f0b030');
      p.line([hx + r * 0.95, hy + r * 0.45 + dip, hx + r * 1.32, hy + r * 0.38 + dip], INK, 1.4);
    },
    front: (p, _f, g) => {
      const [x1, y1, x2, y2] = pole(g, 10, 30);
      p.limb([x1, y1, x2, y2], 3.6, '#5a3e22');
      p.c.save();
      p.c.translate(x2, y2);
      p.c.rotate(g.a);
      p.poly([-3, -12, 0, -21, 3, -12], '#9a9ea3');
      p.rrect(-6.5, -13, 13, 27, 2.5, '#6d7176');
      p.line([-6.5, -5, 6.5, -5], PAL.gold, 1.3);
      p.line([-6.5, 6, 6.5, 6], PAL.gold, 1.3);
      p.c.restore();
    },
  }, 1.15),

  // Tedung: the king cobra. A wide hood with eye-spots, a gold crown band, banded belly, glowing yellow eyes, venom fangs.
  tedung: {
    headX: 10, headY: -89, scale: 1.05, pennant: false,
    draw: (p, f) => {
      const green = '#5e6e2a';
      const belly = '#d8cc80';
      const lean = f.atk === 2 ? (f.follow ? 10 : 14) : f.atk === 1 ? -5 : f.walking ? f.leg * 4 : (f.breathe - 0.5) * 2;
      const coil = f.walking ? f.leg2 * 2.5 : 0;
      p.ell(coil, -9, 26, 9, shade(green, 0.15));
      p.ell(-2 - coil, -17, 20, 8, green);
      for (const x of [-14, -6, 2, 10]) p.shape((q) => q.arc(x - coil, -17, 3.2, Math.PI * 1.1, Math.PI * 1.9), null, shade(green, 0.35));
      p.bend(-8, -17, 10 + lean * 0.3, -38, 2 + lean * 0.6, -64, 14, green);
      p.bend(-4, -19, 13 + lean * 0.3, -38, 6 + lean * 0.6, -62, 5, belly, false);
      for (const t of [0.25, 0.5, 0.75]) {
        const bx = (1 - t) * (1 - t) * -4 + 2 * (1 - t) * t * (13 + lean * 0.3) + t * t * (6 + lean * 0.6);
        const by = (1 - t) * (1 - t) * -19 + 2 * (1 - t) * t * -38 + t * t * -62;
        p.line([bx - 2.5, by, bx + 2.5, by], shade(belly, 0.3), 1);
      }
      const hx = 4 + lean;
      p.ell(hx, -76, 23, 27, green);
      p.ell(hx, -76, 16, 20, shade(green, 0.22), false);
      // pale bands across the hood, like a king cobra's
      for (const [y, w] of [[-86, 12], [-76, 15], [-66, 13]] as const) p.bend(hx - w, y + 3, hx, y - 2, hx + w, y + 3, 2.4, tint(green, 0.45), false);
      p.limb([hx - 13, -55, hx + 13, -55], 5, f.team.base);
      p.ell(hx + 6, -89, 11, 8.5, green);
      p.poly([hx - 1, -95, hx + 1, -101, hx + 4, -96, hx + 7, -102.5, hx + 10, -96, hx + 13, -99.5, hx + 13.5, -93.5, hx - 1, -92.5], PAL.gold);
      glowEyes(p, [hx + 10, -90], 1.6, '#f0e040');
      if (f.atk === 2) {
        p.poly([hx + 13, -85, hx + 15, -78, hx + 17, -85], '#ffffff');
        p.line([hx + 16, -87, hx + 23, -85, hx + 26, -89], '#c0392b', 1.4);
      } else p.line([hx + 15, -87, hx + 20, -86, hx + 22, -89], '#a83a2a', 1.2);
    },
  },

  // Tukang: the builder. A tall bamboo scaffold on the back (the team pennant flies from its top), a tool belt, a big mallet.
  tukang: humanArt({
    skin: '#b8794c', top: '#8a6a48', bottom: '#3a4a5a', build: 'stocky', style: 'melee', hair: '#1d140e', mood: 'grin',
    belt: '#5a3e22', bracers: '#c8b08a', boots: '#5a3e22',
    torso: (p, _f, b) => {
      p.limb([b.wHip - 2, b.hip, b.wHip + 1, b.hip + 9], 2.6, '#a8703c');
      p.limb([b.wHip + 1, b.hip + 9, b.wHip + 2, b.hip + 15], 2, '#d8dde0');
      p.rrect(-b.wHip - 6, b.hip + 1, 8, 7, 1.5, '#7b4a22');
    },
    back: (p, f, b) => {
      const sway = f.walking ? f.leg * 0.8 : 0;
      const bam = '#8fb04a';
      for (const x of [-24, -10]) banded(p, x, b.hip + 6, x + sway, -124, 4, bam, '#4f7a23', 6);
      for (const y of [-58, -78, -98, -118]) {
        p.limb([-26 + sway * 0.5, y, -8 + sway * 0.5, y + 2], 3, bam);
        p.dot(-24 + sway * 0.5, y + 0.2, 1.6, '#d8c08a');
        p.dot(-10 + sway * 0.5, y + 1.6, 1.6, '#d8c08a');
      }
      p.ell(-17, -46, 5, 6, '#d8c08a');
      p.ell(-17, -46, 2.4, 3, shade('#d8c08a', 0.4), false);
    },
    hat: (p, _f, hx, hy, r) => {
      p.shape((x) => { x.arc(hx, hy, r + 0.6, Math.PI * 1.02, Math.PI * 1.98); x.closePath(); }, PAL.clay);
      p.poly([hx - r * 0.9, hy - r * 0.55, hx - r * 1.6, hy - r * 0.95, hx - r * 1.45, hy - r * 0.2], PAL.clay);
      p.line([hx - r, hy - r * 0.12, hx + r, hy - r * 0.12], PAL.clayDark, 1.2);
    },
    front: (p, _f, g) => {
      const [x1, y1, x2, y2] = pole(g, 3, 20);
      p.limb([x1, y1, x2, y2], 3.4, '#93643b');
      p.c.save();
      p.c.translate(x2, y2);
      p.c.rotate(g.a);
      p.rrect(-7, -13, 14, 26, 3, '#a8653d');
      p.line([-7, -8, 7, -8], '#5a3e22', 1.4);
      p.line([-7, 8, 7, 8], '#5a3e22', 1.4);
      p.c.restore();
    },
  }, 1, { x: -24, top: -134 }),

  // Helang: the eagle archer. An eagle helm with a gold beak visor, folded wings, feather pauldrons, a great recurve bow.
  helang: humanArt({
    skin: '#b8794c', top: '#7a5230', bottom: '#4a3420', style: 'ranged', mood: 'stern',
    pauldrons: '#6b4426', pauldronStyle: 'feather', cape: '#5a3a20', capeTrim: '#f4f0e8', capeLong: true,
    bracers: '#4a3420', boots: '#4a3420', belt: '#3a2618',
    back: (p, f, b) => {
      const up = f.walking ? f.leg * -2.5 : -f.breathe * 2;
      p.shape((x) => {
        x.moveTo(-b.wSh + 2, b.sh + 4);
        x.quadraticCurveTo(-b.wSh - 16, b.sh - 20 + up, -b.wSh - 8, b.sh - 40 + up);
        x.lineTo(-b.wSh - 3, b.sh - 30 + up); x.lineTo(-b.wSh + 1, b.sh - 35 + up); x.lineTo(-b.wSh + 3, b.sh - 22 + up);
        x.quadraticCurveTo(-4, b.sh - 8, -2, b.sh + 2);
        x.closePath();
      }, '#6b4426');
      p.line([-b.wSh - 8, b.sh - 40 + up, -b.wSh - 5, b.sh - 31 + up], '#f4f0e8', 2);
      p.line([-b.wSh + 1, b.sh - 35 + up, -b.wSh + 1, b.sh - 27 + up], '#f4f0e8', 2);
      quiver(p, -b.wSh + 4, b.sh + 16, -0.35, '#7b4a22', '#f4f0e8');
    },
    hat: (p, _f, hx, hy, r) => {
      p.poly([hx - r * 0.4, hy - r * 0.9, hx - r * 1.9, hy - r * 1.25, hx - r * 1.2, hy - r * 0.72, hx - r * 2.0, hy - r * 0.6, hx - r * 1.05, hy - r * 0.3, hx - r * 0.8, hy], '#f4f0e8');
      p.shape((x) => { x.arc(hx, hy, r + 1.2, Math.PI * 0.95, Math.PI * 1.97); x.lineTo(hx + r * 0.6, hy - r * 0.45); x.quadraticCurveTo(hx - r * 0.1, hy - r * 0.6, hx - r * 1.05, hy - r * 0.1); x.closePath(); }, '#f4f0e8');
      p.shape((x) => { x.moveTo(hx + r * 0.3, hy - r * 0.95); x.quadraticCurveTo(hx + r * 1.5, hy - r * 1.0, hx + r * 1.55, hy - r * 0.15); x.quadraticCurveTo(hx + r * 1.3, hy - r * 0.45, hx + r * 0.75, hy - r * 0.42); x.closePath(); }, '#e8b030');
      p.dot(hx + r * 0.62, hy - r * 0.72, r * 0.12, INK);
    },
    front: (p, f, g) => recurveBow(p, f, g, 1, '#7b4a22'),
  }, 1, { x: -32, top: -104 }),

  // Embun: the mist weaver. A frost crown, a sheer cape, pale glowing eyes, ice shards orbiting her, a snowflake orb.
  embun: humanArt({
    skin: '#ece4e4', top: '#cfe6f0', bottom: '#9cc0d8', build: 'robe', style: 'hold', hair: '#f4f8fb', mood: 'calm', eyeGlow: '#8fe4ff',
    cape: 'rgba(214,238,250,0.62)', capeTrim: '#bfe8f4', capeLong: true, skirtTrim: '#7aa6c4',
    back: (p, f) => {
      const s = f.walking ? f.leg * 2.5 : f.breathe * 3 - 1.5;
      p.c.save();
      p.c.globalAlpha *= 0.65;
      p.ell(-18 + s, -7, 18, 6.5, '#ffffff', false);
      p.ell(18 - s, -5, 16, 5.5, '#ffffff', false);
      p.c.restore();
      iceShards(p, f, false);
    },
    torso: (p, _f, b) => {
      p.shape((x) => { x.moveTo(-b.wHip, -5); x.quadraticCurveTo(-b.wHip + 4, -12, -b.wHip + 8, -5); x.quadraticCurveTo(-2, -12, 3, -5); x.quadraticCurveTo(8, -12, b.wHip, -5); }, null, '#7aa6c4');
      p.line([0, b.sh + 4, -3, b.sh + 12, 1, b.sh + 18], '#9cc8e8', 1.2);
    },
    hat: (p, _f, hx, hy, r) => {
      for (const [dx, h] of [[-0.78, 8], [-0.4, 13], [0, 19], [0.4, 13], [0.78, 8]] as const) p.poly([hx + dx * r - 2.6, hy - r * 0.7, hx + dx * r, hy - r * 0.7 - h, hx + dx * r + 2.6, hy - r * 0.7], '#bfe8f4');
      p.limb([hx - r * 0.95, hy - r * 0.62, hx + r * 0.95, hy - r * 0.62], 2.2, '#e8f8ff');
    },
    front: (p, f, g) => {
      iceShards(p, f, true);
      const sx = g.x + 11;
      const sy = g.y - 15 - f.breathe * 2 + (f.walking ? f.leg2 * 1.5 : 0);
      p.glow(sx, sy, f.atk ? 24 : 18, '#bfe8f4', 0.9);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI + (f.atk ? 0.3 : 0);
        const ax = Math.cos(a) * 10;
        const ay = Math.sin(a) * 10;
        p.limb([sx - ax, sy - ay, sx + ax, sy + ay], 2.2, '#e8f8ff');
        p.dot(sx + ax, sy + ay, 1.6, '#ffffff');
        p.dot(sx - ax, sy - ay, 1.6, '#ffffff');
      }
    },
  }),

  // Ombak: the wave rider. A big wave curling up behind him, shell pauldrons, a scaled skirt, a shell circlet, a gold trident.
  ombak: humanArt({
    skin: '#b07850', top: '#2f9a8a', bottom: '#2f9a8a', style: 'melee', hair: '#1d140e', mood: 'fierce',
    pauldrons: '#efd6b8', pauldronStyle: 'shell', skirt: '#2a7a6a', skirtTrim: '#efd6b8', bracers: '#2a7a6a', belt: '#5a3e22',
    legs: (p, f) => {
      const s = f.walking ? f.leg * 3 : (f.breathe - 0.5) * 2;
      p.shape((x) => {
        x.moveTo(-40, -2);
        x.quadraticCurveTo(-44, -44, -22, -66 + s);
        x.quadraticCurveTo(-4, -72 + s, 2, -58 + s);
        x.quadraticCurveTo(-8, -64 + s, -16, -56 + s);
        x.quadraticCurveTo(-26, -40, -10, -30);
        x.quadraticCurveTo(14, -24, 34, -2);
        x.closePath();
      }, PAL.river);
      p.shape((x) => { x.moveTo(-22, -66 + s); x.quadraticCurveTo(-4, -72 + s, 2, -58 + s); x.quadraticCurveTo(-6, -62 + s, -14, -60 + s); x.quadraticCurveTo(-20, -62 + s, -22, -66 + s); x.closePath(); }, '#e8f6f8');
      p.line([-30, -14, -16, -18, -2, -14, 12, -18, 24, -12], '#8fd0d4', 2);
      p.line([-35, -28, -31, -44, -24, -54], '#8fd0d4', 1.6);
      for (const [x, y] of [[-38, -4], [32, -4], [-20, -8]] as const) p.dot(x, y - s * 0.3, 2, '#e8f6f8');
    },
    torso: (p, _f, b) => {
      for (const y of [b.hip + 7, b.hip + 13]) for (let x = -b.wHip - 1; x <= b.wHip + 2; x += 4) p.shape((q) => q.arc(x, y, 2.2, 0, Math.PI), null, '#1f5a4e');
    },
    hat: (p, _f, hx, hy, r) => {
      p.limb([hx - r, hy - r * 0.5, hx + r * 0.9, hy - r * 0.58], 2.4, PAL.gold);
      const sx = hx + r * 0.25;
      const sy = hy - r * 0.62;
      p.shape((x) => { x.moveTo(sx, sy + 2); x.lineTo(sx - 5, sy - 4); x.quadraticCurveTo(sx, sy - 9, sx + 5, sy - 4); x.closePath(); }, '#efd6b8');
      p.line([sx, sy + 1, sx, sy - 6], '#c9a87a', 0.9);
    },
    front: (p, _f, g) => {
      const [x1, y1, x2, y2] = pole(g, 26, 36);
      p.limb([x1, y1, x2, y2], 3.2, PAL.goldDark);
      const dx = Math.cos(g.a);
      const dy = Math.sin(g.a);
      const nx = -dy;
      const ny = dx;
      p.limb([x2 + nx * 7, y2 + ny * 7, x2 - nx * 7, y2 - ny * 7], 2.4, PAL.gold);
      for (const o of [-6.5, 0, 6.5]) {
        const len = o === 0 ? 13 : 10;
        const tx = x2 + nx * o + dx * len;
        const ty = y2 + ny * o + dy * len;
        p.limb([x2 + nx * o, y2 + ny * o, tx, ty], 2.2, PAL.gold);
        p.poly([tx - nx * 2.4, ty - ny * 2.4, tx + dx * 4, ty + dy * 4, tx + nx * 2.4, ty + ny * 2.4], '#f4d27a');
      }
    },
  }),

  // Buaya: the crocodile bruiser. Long toothy jaws, glowing eyes, scute pauldrons, a ridged back and heavy spiked tail, claws.
  buaya: humanArt({
    skin: '#4f7a3a', top: '#4f7a3a', bottom: '#3a5a2a', build: 'stocky', style: 'melee', sleeve: '#4f7a3a',
    pauldrons: '#3f6a2e', pauldronStyle: 'shell', skirt: '#6b4a2a', skirtTrim: '#d8c08a', bracers: '#3a2a1a', belt: '#3a2618',
    back: (p, f, b) => {
      const tw = f.walking ? f.leg2 * 3 : 0;
      p.shape((x) => { x.moveTo(-8, b.hip + 2); x.quadraticCurveTo(-36, b.hip + 8, -50 + tw, -2); x.quadraticCurveTo(-26, b.hip + 26, -4, b.hip + 16); x.closePath(); }, '#4f7a3a');
      for (const [x, y] of [[-17, b.hip + 4], [-27, b.hip + 8], [-36, b.hip + 15], [-43 + tw * 0.6, b.hip + 25]] as const) p.poly([x - 3, y + 2, x - 1, y - 5, x + 2.5, y + 2], '#3a5a2a');
      for (const [x, y] of [[-b.wSh - 1, b.sh + 4], [-b.wSh - 2, b.sh + 12], [-b.wSh - 2, b.sh + 20]] as const) p.poly([x + 3, y - 3, x - 6, y - 2, x + 2, y + 4], '#3a5a2a');
    },
    torso: (p, _f, b) => {
      p.ell(3, b.sh + 17, 8.5, 12, '#c8c080', false);
      for (const y of [b.sh + 11, b.sh + 17, b.sh + 23]) p.line([-4, y, 10, y], '#8a9a50', 1.3);
    },
    head: (p, f, hx, hy, r) => {
      const open = f.atk === 2 ? 5 : f.atk === 1 ? 2 : 0;
      p.circle(hx - 2, hy, r * 0.92, '#4f7a3a');
      p.rrect(hx, hy + r * 0.2 + open * 0.5, r * 1.8, r * 0.42, r * 0.18, '#6b8f45');
      const teeth: number[] = [];
      for (let i = 0; i <= 8; i++) teeth.push(hx + 3 + i * 2.3, hy + r * 0.2 + open * 0.5 + (i % 2 ? 0 : -2.2));
      p.line(teeth, '#fbf3df', 1.3);
      const up = open * 0.4;
      p.shape((x) => { x.moveTo(hx - 2, hy - r * 0.55); x.lineTo(hx + r * 2.0, hy - r * 0.28 - up); x.quadraticCurveTo(hx + r * 2.25, hy + r * 0.02 - up, hx + r * 1.95, hy + r * 0.14 - up); x.lineTo(hx, hy + r * 0.14); x.closePath(); }, '#4f7a3a');
      const top: number[] = [];
      for (let i = 0; i <= 9; i++) top.push(hx + 2 + i * 2.3, hy + r * 0.14 - up * (i / 9) + (i % 2 ? 2.2 : 0));
      p.line(top, '#fbf3df', 1.3);
      p.circle(hx + r * 1.85, hy - r * 0.3 - up, r * 0.18, '#4f7a3a');
      p.circle(hx + r * 0.15, hy - r * 0.62, r * 0.32, '#4f7a3a');
      glowEyes(p, [hx + r * 0.2, hy - r * 0.66], r * 0.12, '#f0d040');
      for (const x of [-0.4, 0.5, 1.0]) p.dot(hx + r * x, hy - r * 0.38, 1.1, '#3a5a2a');
    },
    front: (p, f, g) => {
      for (let i = 0; i < 3; i++) p.bend(g.x + 2, g.y - 3 + i * 3, g.x + 8, g.y - 6 + i * 3.2, g.x + 11, g.y - 2 + i * 3.4, 1.8, '#fbf3df');
      if (f.atk === 2 && !f.follow) for (let i = 0; i < 3; i++) p.line([g.x + 13, g.y - 14 + i * 7, g.x + 22, g.y - 3 + i * 7], '#ffffff', 2);
    },
  }, 1.15),
};

// ---------------------------------------------------------------------------------------------
// troops

interface TroopArt { draw: (p: Pen, f: Pose) => void; scale: number; wide?: boolean }

/**
 * Four legs in a four-beat walk (each a quarter cycle after the last): xs = far hind, near hind,
 * far fore, near fore. A stepping leg lifts its hoof; hind knees bend back, fore knees forward.
 */
function quadLegs(p: Pen, f: Pose, xs: readonly [number, number, number, number], hip: number, w: number, color: string,
  o: { far?: boolean; near?: boolean; hoof?: string } = {}): void {
  const one = (x: number, swing: number, lift: number, fore: boolean, col: string) => {
    const fx = x + swing * 6 + lift * 2;
    const fy = -4 - lift * 6;
    const kx = (x + fx) / 2 + (fore ? 2.5 : -2.5) + lift * (fore ? 3 : -1);
    const ky = (hip + fy) / 2 - lift * 2;
    p.limb([x, hip, kx, ky, fx, fy], w, col);
    if (o.hoof) p.ell(fx, fy + 1, w * 0.55, 2.4, o.hoof, true);
  };
  const L = (v: number) => (f.walking ? Math.max(0, v) : 0);
  const both = !o.far && !o.near;
  if (both || o.far) {
    const dk = shade(color, 0.25);
    one(xs[0], -f.leg, L(f.lift), false, dk);
    one(xs[2], -f.leg2, L(f.leg), true, dk);
  }
  if (both || o.near) {
    one(xs[1], f.leg, L(-f.lift), false, color);
    one(xs[3], f.leg2, L(-f.leg), true, color);
  }
}

/** Insect and crab legs rippling front to back while walking. */
function ripple(f: Pose, i: number, side: number): number {
  return f.walking ? Math.cos(TAU * (f.phase * 2 + i / 3 + (side > 0 ? 0.5 : 0))) : f.atk ? f.leg * 0.4 * side : 0;
}

function lunge(f: Pose, n = 5): number {
  return f.atk === 2 ? n : f.atk === 1 ? -n * 0.5 : 0;
}

function insect(p: Pen, f: Pose, body: string, opts: { big?: boolean; crown?: boolean; dark?: string }): void {
  const s = opts.big ? 1.55 : 1.35;
  const dk = opts.dark ?? INK;
  p.c.save();
  p.c.translate(lunge(f, 4), f.bob * 0.5);
  // legs, rippling front to back
  [-8, 2, 12].forEach((x, i) => {
    const a = ripple(f, i, -1) * 4;
    const b = ripple(f, i, 1) * 4;
    p.line([x * s, -22 * s, (x - 5 + a) * s, -15 * s - Math.max(0, a) * 0.4, (x - 8 + a) * s, -4 - Math.max(0, -a) * 0.8], dk, 2.4);
    p.line([x * s, -22 * s, (x + 3 + b) * s, -15 * s - Math.max(0, b) * 0.4, (x + 6 + b) * s, -4 - Math.max(0, -b) * 0.8], dk, 2.4);
  });
  // abdomen (with a sting and bands), thorax, head
  p.poly([-33 * s, -30 * s, -40 * s, -27 * s, -33 * s, -24 * s], dk);
  p.ell(-18 * s, -28 * s, 17 * s, 13 * s, body);
  p.line([-14 * s, -40 * s, -12 * s, -16 * s], shade(body, 0.3), 2);
  p.line([-26 * s, -36 * s, -24 * s, -18 * s], f.team.base, 4.5 * s);
  p.ell(2 * s, -28 * s, 8 * s, 7 * s, body);
  p.circle(16 * s, -32 * s, 9 * s, body);
  // mandibles that snap shut on the strike
  const m = f.atk === 2 ? 0 : 3;
  p.bend(22 * s, -28 * s, 30 * s, -30 * s - m, 31 * s, -24 * s, 2, dk);
  p.bend(21 * s, -26 * s, 28 * s, -22 * s + m, 27 * s, -18 * s, 2, dk);
  if (opts.crown) glowEyes(p, [19 * s, -34 * s], 2 * s, '#ffcf5a');
  else { p.dot(19 * s, -34 * s, 2.4 * s, INK); p.dot(18.4 * s, -34.8 * s, 0.9 * s, '#ffffff'); }
  const ant = f.breathe * 2 + (f.walking ? f.leg * 1.5 : 0);
  p.line([20 * s, -40 * s, 26 * s, -52 * s - ant, 32 * s, -50 * s - ant], dk, 1.8);
  p.line([16 * s, -40 * s, 18 * s, -54 * s + ant * 0.5, 24 * s, -56 * s + ant * 0.5], dk, 1.8);
  if (opts.crown) p.poly([10 * s, -40 * s, 11 * s, -48 * s, 14 * s, -43 * s, 17 * s, -50 * s, 20 * s, -43 * s, 23 * s, -48 * s, 22 * s, -39 * s], PAL.gold);
  p.c.restore();
}

/** A team tabard over a militia troop's chest: their uniform (team colour, gold hem and badge). */
function tabard(p: Pen, f: Pose, b: Build): void {
  p.shape((x) => { x.moveTo(-b.wSh + 5, b.sh + 2); x.lineTo(b.wSh - 4, b.sh + 2); x.lineTo(b.wHip + 1, b.hip + 14); x.lineTo(1, b.hip + 18); x.lineTo(-b.wHip - 1, b.hip + 14); x.closePath(); }, f.team.base);
  p.line([-b.wHip, b.hip + 13, 1, b.hip + 17, b.wHip, b.hip + 13], PAL.gold, 1.5);
  p.poly([1, b.sh + 8, 4.5, b.sh + 13, 1, b.sh + 18, -2.5, b.sh + 13], PAL.gold);
}

/** A militia helmet: an iron cap with a gold ridge, and a team plume if `plume`. */
function helm(p: Pen, f: Pose, hx: number, hy: number, r: number, plume: boolean): void {
  const metal = '#8b8f94';
  if (plume) p.shape((x) => { x.moveTo(hx - r * 0.1, hy - r * 1.1); x.quadraticCurveTo(hx - r * 1.1, hy - r * 2.1, hx - r * 2.0, hy - r * 1.3); x.quadraticCurveTo(hx - r * 1.0, hy - r * 1.35, hx - r * 0.45, hy - r * 0.75); x.closePath(); }, f.team.base);
  p.shape((x) => { x.arc(hx, hy - 1, r + 1.6, Math.PI, 0); x.closePath(); }, metal);
  p.limb([hx - r - 1.6, hy - 1, hx + r + 1.6, hy - 1], 3, shade(metal, 0.3));
  p.line([hx - r * 0.35, hy - r - 2, hx + r * 0.25, hy - r * 0.35], PAL.gold, 1.4);
  p.limb([hx + r * 0.55, hy - 1, hx + r * 0.6, hy + r * 0.45], 2.2, shade(metal, 0.3));
}

/** A recurve bow held at the front hand; `s` scales its length. */
function recurveBow(p: Pen, f: Pose, g: Hold, s: number, wood: string): void {
  const cx = g.x + 3;
  const cy = g.y;
  for (const k of [-1, 1]) {
    p.bend(cx, cy, cx - 2 * s, cy + k * 20 * s, cx - 11 * s, cy + k * 29 * s, 3.2, wood);
    p.bend(cx - 11 * s, cy + k * 29 * s, cx - 13.5 * s, cy + k * 33 * s, cx - 7 * s, cy + k * 36 * s, 2.6, wood);
  }
  p.limb([cx, cy - 4, cx, cy + 4], 4.4, '#3a2618');
  const nock = f.atk === 1 ? cx - 26 * s : cx - 11 * s;
  p.line([cx - 11 * s, cy - 29 * s, nock, cy, cx - 11 * s, cy + 29 * s], '#fbf3df', 1);
  if (f.atk === 1) {
    p.line([nock, cy, cx + 16, cy], '#5a3e22', 1.8);
    p.poly([cx + 16, cy - 2.6, cx + 22, cy, cx + 16, cy + 2.6], '#d8dde0');
  }
  if (f.atk === 2 && !f.follow) p.line([cx + 22, cy, cx + 44, cy], '#fbf3df', 1.8);
}

/** A cloth draped over a big beast's back in team colour, with a gold fringe. */
function caparison(p: Pen, f: Pose, x0: number, x1: number, top: number, bottom: number): void {
  p.shape((x) => { x.moveTo(x0, top + 4); x.quadraticCurveTo((x0 + x1) / 2, top - 6, x1, top + 2); x.lineTo(x1 + 2, bottom); x.lineTo(x0 - 2, bottom); x.closePath(); }, f.team.base);
  p.line([x0 - 2, bottom - 1, x1 + 2, bottom - 1], PAL.gold, 1.8);
  for (let x = x0; x <= x1; x += 4) p.line([x, bottom, x, bottom + 4], PAL.gold, 1.3);
  const mx = (x0 + x1) / 2;
  const my = (top + bottom) / 2;
  p.poly([mx, my - 4, mx + 3.4, my, mx, my + 4, mx - 3.4, my], PAL.gold);
}

const TROOPS_ART: Record<UnitKind, TroopArt> = {
  // Kampung militia: iron helmets, team plumes and tabards (PLAN-014)
  spearman: { scale: 1, draw: (p, f) => human(p, f, {
    skin: '#c08458', top: '#a8703c', bottom: '#6b4a2a', style: 'melee', sash: false, boots: '#5a3e22', belt: '#4a2a14', mood: 'stern',
    torso: (q, ff, b) => tabard(q, ff, b),
    hat: (q, ff, hx, hy, r) => helm(q, ff, hx, hy, r, true),
    front: (q, ff, g) => {
      const [x1, y1, x2, y2] = pole(g, 30, 46);
      banded(q, x1, y1, x2, y2, 3.4, '#93643b', '#5a3e22', 2);
      const dx = Math.cos(g.a);
      const dy = Math.sin(g.a);
      q.poly([x2 - dy * 3, y2 + dx * 3, x2 - dy * 5 + dx * 7, y2 + dx * 5 + dy * 7, x2 + dx * 16, y2 + dy * 16, x2 + dy * 5 + dx * 7, y2 - dx * 5 + dy * 7, x2 + dy * 3, y2 - dx * 3], '#d8dde0');
      q.line([x2 - dx * 1, y2 - dy * 1, x2 - dx * 6 - dy * 3, y2 - dy * 6 + dx * 3], ff.team.base, 2.4);
    },
  }) },
  archer: { scale: 1, draw: (p, f) => human(p, f, {
    skin: '#c08458', top: '#6a8a4a', bottom: '#4a6a3a', style: 'ranged', sash: false, boots: '#5a3e22', bracers: '#8a6a3a', hair: '#1d140e', mood: 'stern',
    torso: (q, ff, b) => tabard(q, ff, b),
    back: (q, _f, b) => quiver(q, -b.wSh + 2, b.sh + 14, -0.4, '#7a5230', '#e8dcc0'),
    hat: (q, ff, hx, hy, r) => {
      q.shape((x) => { x.arc(hx, hy - 0.5, r + 1, Math.PI * 1.02, Math.PI * 1.98); x.lineTo(hx + r * 1.5, hy - r * 0.2); x.closePath(); }, '#7a5230');
      q.bend(hx - r * 0.6, hy - r * 0.9, hx - r * 1.4, hy - r * 1.9, hx - r * 2.0, hy - r * 1.4, 3, ff.team.base);
    },
    front: (q, ff, g) => recurveBow(q, ff, g, 0.8, '#93643b'),
  }) },
  shieldbearer: { scale: 1.1, draw: (p, f) => human(p, f, {
    skin: '#b07850', top: '#8a7450', bottom: '#5a4632', build: 'stocky', style: 'melee', sash: false, boots: '#4a3a2a', bracers: '#9a9ea3',
    pauldrons: '#8b8f94', mood: 'stern',
    torso: (q, ff, b) => tabard(q, ff, b),
    hat: (q, ff, hx, hy, r) => helm(q, ff, hx, hy, r, false),
    front: (q, _f, g) => {
      const [, , x2, y2] = pole(g, 0, 22);
      q.limb([g.x, g.y, x2, y2], 3.2, '#d8dde0');
    },
    over: (q, ff) => {
      const sx = ff.follow ? 22 : ff.atk === 2 ? 26 : ff.atk === 1 ? 12 : 18;
      const top = ff.atk === 1 ? -73 : -70;
      const h = 60;
      q.rrect(sx - 13, top, 26, h, 12, '#c8a060');
      q.rrect(sx - 9.5, top + 4, 19, h - 8, 9, ff.team.base);
      q.line([sx - 9, top + h * 0.62, sx + 9, top + h * 0.62], PAL.gold, 1.6);
      q.circle(sx, top + h * 0.4, 4.6, PAL.gold);
      for (const dy of [6, h / 2, h - 7]) for (const dx of [-11, 11]) q.dot(sx + dx, top + dy, 1.3, '#6b4426');
    },
  }) },
  // the ram: an armoured water buffalo under a team caparison
  ram: { scale: 1.2, wide: true, draw: (p, f) => {
    const c = '#4f555a';
    p.c.save(); p.c.translate(lunge(f, 6), f.bob * 0.5);
    p.line([-34, -44, -40, -28], INK, 2.4);
    quadLegs(p, f, [-24, -14, 16, 26], -34, 9, c, { hoof: '#2a2a2e' });
    p.ell(0, -42, 34, 17, c);
    caparison(p, f, -24, 14, -58, -36);
    p.ell(36, -46, 12, 11, c);
    p.ell(44, -42, 6, 5, '#6d7378');
    p.poly([29, -56, 41, -55, 46, -45, 35, -41], '#9a9ea3');
    p.dot(34, -52, 1, '#5a5e64'); p.dot(40, -50, 1, '#5a5e64');
    p.dot(37, -47, 1.8, INK);
    p.bend(30, -56, 4, -68, 2, -50, 5, '#e2d8bc');
    p.bend(38, -56, 64, -70, 66, -50, 5, '#e2d8bc');
    p.circle(2, -50, 2.2, '#9a9ea3'); p.circle(66, -50, 2.2, '#9a9ea3');
    p.c.restore();
  } },
  // forest beasts: team harness, sharper faces
  kera: { scale: 1, draw: (p, f) => {
    const c = '#8a5a32';
    const hop = f.walking ? f.bob * 2.4 : f.bob;
    const tw = f.walking ? f.leg2 * 5 : (f.breathe - 0.5) * 4;
    p.c.save(); p.c.translate(lunge(f, 5), hop);
    p.bend(-12, -22, -36, -26 + tw, -30 + tw, -50, 4, c);
    p.circle(-27 + tw, -50, 4, null);
    p.limb([-6, -22, -9 - f.leg * 4, -13 - Math.max(0, f.lift) * 3, -10 - f.leg * 5, -4 - Math.max(0, f.lift) * 4], 7, shade(c, 0.2));
    p.limb([8, -22, 11 + f.leg * 4, -13 - Math.max(0, -f.lift) * 3, 12 + f.leg * 5, -4 - Math.max(0, -f.lift) * 4], 7, c);
    p.ell(0, -32, 14, 15, c);
    p.ell(3, -28, 8, 9, '#d8b080', false);
    p.line([-11, -42, 10, -24], f.team.base, 3.4);
    p.circle(-12, -58, 6, c); p.circle(-12, -58, 3, '#d8b080', false);
    p.circle(2, -56, 15, c);
    p.ell(7, -53, 10, 9, '#d8b080');
    p.limb([-11, -66, 14, -68], 5, f.team.base);
    p.bend(-11, -66, -18, -68 + tw * 0.4, -22, -62 + tw * 0.6, 3, f.team.base);
    eyes(p, 2, -55, 12);
    p.line([0, -61, 5, -59], INK, 1.6); p.line([8, -59, 13, -61], INK, 1.6);
    if (f.atk) p.poly([7, -48, 9, -44, 11, -48], '#ffffff');
    const hx = f.atk ? 26 : 18;
    const hy = f.atk === 2 ? -44 : f.atk === 1 ? -52 : -30;
    p.limb([10, -40, hx, hy], 5, c);
    p.limb([hx - 2, hy + 4, hx + 4, hy - 10], 4, '#e8dcc0');
    p.circle(hx + 4, hy - 11, 3, '#e8dcc0');
    p.c.restore();
  } },
  harimau: { scale: 1.15, wide: true, draw: (p, f) => {
    const c = '#b8a074';
    p.c.save(); p.c.translate(lunge(f, 8), f.bob * 0.4 + (f.atk === 1 ? 3 : 0));
    const tw = f.walking ? f.leg2 * 5 : (f.breathe - 0.5) * 4;
    p.bend(-28, -32, -52, -30 + tw, -50 + tw * 0.6, -12, 6, c);
    p.line([-50 + tw * 0.6, -12, -50 + tw * 0.6, -18], INK, 3);
    quadLegs(p, f, [-20, -10, 14, 24], -26, 7.5, c);
    p.ell(0, -33, 30, 12, c);
    p.ell(16, -36, 12, 10, c);
    for (const [x, y] of [[-16, -35], [-4, -38], [8, -34], [-10, -28], [4, -28], [18, -40]] as const) p.ell(x, y, 4, 3, '#5a4a32', false);
    p.limb([20, -46, 24, -26], 5, f.team.base);
    p.dot(22, -36, 1.5, PAL.gold);
    p.poly([25, -46, 26, -55, 31, -48], c);
    p.circle(32, -40, 10, c);
    p.ell(39, -36, 5, 4, '#e8dcc0');
    p.line([29, -45, 36, -43], INK, 1.6);
    glowEyes(p, [34, -42], 1.4, '#ffc040');
    if (f.atk) { p.poly([38, -33, 39.5, -28, 41, -33], '#ffffff'); p.poly([42, -33, 43, -29, 44, -33], '#ffffff'); }
    p.c.restore();
  } },
  enggang: { scale: 1, wide: true, draw: (p, f) => {
    const u = (f.flap + 1) / 2; // 1 = wings up, 0 = down
    const lerp = (a: number, b: number) => a + (b - a) * u;
    p.c.save(); p.c.translate(0, f.bob * 0.5 + (1 - u) * 2);
    p.shape((x) => { x.moveTo(-4, -48); x.quadraticCurveTo(-18, lerp(-36, -80), -34, lerp(-30, -78)); x.lineTo(-10, -42); x.closePath(); }, '#2a2a30');
    p.poly([-20, -46, -44, -40, -44, -28, -20, -38], '#f4f0e8');
    p.line([-35, -42, -35, -30], INK, 3);
    p.ell(-2, -44, 20, 10, '#1d1d22');
    p.line([-6, -40, 10, -38], '#f4f0e8', 2.4);
    p.shape((x) => { x.moveTo(-2, -46); x.quadraticCurveTo(10, lerp(-30, -84), -10, lerp(-24, -82)); x.lineTo(-16, -42); x.closePath(); }, '#2a2a30');
    p.line([-12, lerp(-30, -72), 0, lerp(-38, -60)], '#f4f0e8', 2.4);
    p.line([-14, lerp(-34, -76), -4, lerp(-40, -64)], f.team.base, 2.2);
    p.limb([12, -54, 14, -44], 4.5, f.team.base);
    p.circle(18, -56, 8, '#1d1d22');
    p.circle(20, -58, 2.4, '#e05a3a', false);
    p.dot(20.5, -58, 1.2, INK);
    p.shape((x) => { x.moveTo(21, -63); x.quadraticCurveTo(34, -73, 44, -63); x.quadraticCurveTo(34, -65, 24, -58); x.closePath(); }, '#e0702a');
    p.shape((x) => { x.moveTo(24, -58); x.quadraticCurveTo(42, -62, 52, -49); x.quadraticCurveTo(38, -52, 24, -52); x.closePath(); }, '#f0b030');
    p.c.restore();
  } },
  seladang: { scale: 1.25, wide: true, draw: (p, f) => {
    const c = '#3a2a22';
    p.c.save(); p.c.translate(lunge(f, 7), f.bob * 0.5);
    p.line([-34, -44, -40, -28], INK, 2.4);
    quadLegs(p, f, [-24, -14, 16, 26], -34, 9.5, c, { hoof: '#f4f0e8' });
    p.ell(0, -42, 34, 17, c);
    p.ell(12, -57, 15, 10, c);
    caparison(p, f, -22, 4, -58, -40);
    p.ell(36, -44, 12, 11, c);
    p.ell(44, -40, 6, 5, '#5a4438');
    p.ell(33, -52, 7, 4, '#c8a878', false);
    glowEyes(p, [36, -47], 1.4, '#ff8a3a');
    p.bend(32, -54, 24, -68, 34, -73, 4.5, '#e2d8bc');
    p.bend(40, -54, 50, -66, 45, -73, 4.5, '#e2d8bc');
    p.c.restore();
  } },
  // river creatures
  ketam: { scale: 1.1, wide: true, draw: (p, f) => {
    const c = '#5f7060';
    const lg = f.leg * 3;
    p.c.save(); p.c.translate(lunge(f, 3) + lg, 0);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const r = ripple(f, i, s);
      p.line([s * 14, -18, s * (22 + i * 4), -16 - Math.max(0, r) * 3, s * (26 + i * 4) + r * 2, -4 - (i % 2) * 3 - Math.max(0, r) * 3], INK, 2.6);
    }
    p.ell(0, -22, 26, 14, c);
    for (const x of [-14, -5, 5, 14]) p.poly([x - 2.5, -34, x, -39, x + 2.5, -34], shade(c, 0.2));
    p.limb([-18, -28, 18, -28], 4.5, f.team.base);
    const cy = f.atk ? -48 : -38;
    const shut = f.atk === 2 ? 0 : 4;
    for (const s of [-1, 1]) {
      p.limb([s * 16, -26, s * 26, cy + 6], 4.5, c);
      p.ell(s * 29, cy, 9, 7, tint(c, 0.15));
      p.poly([s * 31, cy - 4, s * 41, cy - 11 - shut, s * 36, cy], tint(c, 0.15));
      p.poly([s * 32, cy + 2, s * 41, cy + 3 + shut * 0.5, s * 34, cy + 5], tint(c, 0.15));
    }
    p.line([-5, -34, -6, -43], INK, 2); p.line([5, -34, 6, -43], INK, 2);
    p.circle(-6, -44, 2.6, '#f4f0e8'); p.circle(6, -44, 2.6, '#f4f0e8');
    p.dot(-5.5, -44, 1.3, INK); p.dot(6.5, -44, 1.3, INK);
    p.c.restore();
  } },
  sumpit: { scale: 1.1, wide: true, draw: (p, f) => {
    const c = '#d8d0a0';
    const hop = f.walking ? f.bob * 3 : f.bob * 1.5;
    p.c.save();
    p.c.globalAlpha *= 0.8;
    p.ell(0, -3, 18, 4, '#6cc4c9', '#2a8496');
    p.c.restore();
    p.c.save(); p.c.translate(lunge(f, 3), hop);
    const fl = f.walking ? f.leg * 4 : (f.breathe - 0.5) * 3;
    p.poly([-22, -38, -38, -52 + fl, -34, -38, -38, -24 + fl], c);
    p.ell(0, -38, 24, 13, c);
    for (const x of [-12, -2, 8]) p.line([x, -49, x + 2, -28], '#3a3a3a', 3.2);
    p.poly([-8, -50, 6, -50, -2, -63], f.team.base);
    p.poly([-6, -26, 6, -26, -2, -19], f.team.base);
    p.circle(14, -41, 5, '#fbf3df');
    p.dot(15, -41, 2.6, INK);
    p.dot(14, -42.2, 1, '#ffffff');
    p.line([21, -36, 24, -38], INK, 1.4);
    if (f.atk === 2) p.line([24, -42, 40, -48, 50, -50], '#6cc4c9', 3);
    p.c.restore();
  } },
  belut: { scale: 1.1, wide: true, draw: (p, f) => {
    const c = '#4a5a3a';
    p.c.save(); p.c.translate(lunge(f, 5), 0);
    const amp = f.walking ? 7 : 3;
    const t0 = f.walking ? f.phase * TAU : f.breathe * 1.5;
    const pts: number[] = [];
    for (let k = 0; k <= 6; k++) {
      const x = -34 + k * 8;
      const y = -8 - k * k * 0.75 + Math.sin(t0 * 2 - k * 1.1) * amp * (1 - k / 9);
      pts.push(x, y);
    }
    pts.push(22, -40);
    p.limb(pts, 10, c);
    p.line(pts, '#8a9a5a', 3);
    p.limb([10, -32, 16, -38], 11, f.team.base);
    p.circle(24, -42, 8, c);
    glowEyes(p, [27, -44], 1.5, '#f0e040');
    p.line([27, -38, 32, -39], INK, 1.4);
    const sp = '#f0e040';
    if (f.frame % 2 === 0 || f.atk) p.line([30, -55, 26, -51, 32, -49, 28, -45], sp, 2.2);
    if (f.atk) p.line([30, -42, 38, -46, 34, -40, 44, -42], sp, 2.6);
    p.c.restore();
  } },
  // insects
  kerengga: { scale: 0.9, wide: true, draw: (p, f) => insect(p, f, '#d8902a', {}) },
  tebuan: { scale: 1, wide: true, draw: (p, f) => {
    const u = (f.flap + 1) / 2;
    const lerp = (a: number, b: number) => a + (b - a) * u;
    p.c.save(); p.c.translate(lunge(f, 4), f.bob * 0.5 - 10); p.c.scale(1.4, 1.4); p.c.translate(0, 8);
    p.c.save();
    p.c.globalAlpha *= 0.75;
    p.ell(-2, lerp(-40, -50), 12, 6, '#f4f8fb', '#7a8a90', lerp(0.3, -0.6));
    p.c.restore();
    p.poly([-31, -32, -42, -29, -31, -25], INK);
    p.ell(-18, -30, 14, 10, '#e8c030');
    p.line([-24, -39, -22, -21], INK, 3); p.line([-14, -40, -12, -21], INK, 3);
    p.ell(0, -32, 8, 7, '#2a2418');
    p.line([-3, -38, 3, -26], f.team.base, 4.5);
    p.circle(13, -34, 7.5, '#e8c030');
    glowEyes(p, [15, -36], 1.6, '#ff8a3a');
    p.line([18, -30, 22, -28], INK, 1.6);
    p.c.save();
    p.c.globalAlpha *= 0.75;
    p.ell(2, lerp(-38, -48), 12, 6, '#ffffff', '#7a8a90', lerp(0.4, -0.4));
    p.c.restore();
    p.c.restore();
  } },
  kumbang: { scale: 1.1, wide: true, draw: (p, f) => {
    const c = '#3a2418';
    p.c.save(); p.c.translate(lunge(f, 5), 0);
    [-12, 0, 12].forEach((x, i) => {
      const a = ripple(f, i, -1) * 3;
      const b = ripple(f, i, 1) * 3;
      p.line([x, -16, x - 6 + a, -3 - Math.max(0, -a)], INK, 2.6);
      p.line([x, -16, x + 6 + b, -3 - Math.max(0, -b)], INK, 2.6);
    });
    p.ell(-4, -24, 26, 16, c);
    p.ell(-12, -31, 10, 4.5, '#8a6a58', false);
    p.line([-4, -39, -4, -9], f.team.base, 4);
    p.circle(22, -24, 8, c);
    p.shape((x) => { x.moveTo(24, -30); x.quadraticCurveTo(30, -50, 21, -58); x.quadraticCurveTo(40, -48, 31, -26); x.closePath(); }, '#4a3020');
    p.poly([27, -44, 33, -46, 29, -40], '#4a3020');
    glowEyes(p, [26, -24], 1.5, '#ff7a3a');
    p.c.restore();
  } },
  ratu: { scale: 1.1, wide: true, draw: (p, f) => insect(p, f, '#c8822a', { big: true, crown: true }) },
  // stone
  kerikil: { scale: 1, draw: (p, f) => {
    const c = '#8a8a86';
    const roll = f.walking ? f.phase * TAU : 0;
    p.c.save(); p.c.translate(lunge(f, 6), f.walking ? f.bob * 0.5 : 0); p.c.scale(1.45, 1.45);
    p.circle(0, -20, 18, c);
    for (let i = 0; i < 3; i++) {
      const a = roll + i * 2.1;
      p.ell(Math.cos(a) * 10, -20 + Math.sin(a) * 9, 4, 3, '#6d6d6a', false);
    }
    p.line([-12, -30, -6, -24, -9, -16], '#5a5a58', 1.2);
    p.limb([-15, -9, 2, -37], 5, f.team.base);
    p.line([3, -26, 8, -25], INK, 1.4); p.line([10, -25, 15, -26], INK, 1.4);
    p.dot(6, -22, 2.4, INK); p.dot(12, -23, 2.4, INK);
    p.dot(5.4, -22.8, 0.9, '#ffffff'); p.dot(11.4, -23.8, 0.9, '#ffffff');
    p.shape((x) => { x.arc(10, -17, 4, 0.2, Math.PI - 0.2); }, null, true);
    p.c.restore();
  } },
  golem: { scale: 1.35, draw: (p, f) => {
    const c = '#7d7f86';
    const sw = f.leg * 6;
    const ember = '#ffb040';
    p.c.save(); p.c.translate(lunge(f, 5), f.bob * 0.5);
    p.limb(legPts(-10, -26, -sw, f.walking ? Math.max(0, f.lift) * 0.7 : 0), 12, shade(c, 0.25));
    p.limb(legPts(10, -26, sw, f.walking ? Math.max(0, -f.lift) * 0.7 : 0), 12, c);
    p.circle(-24, -48, 11, shade(c, 0.2));
    p.limb([-24, -46, -28 + f.arm * 5, -24], 11, shade(c, 0.2));
    p.ell(0, -48, 22, 24, c);
    p.ell(-8, -60, 8, 5, '#6d6f76', false);
    p.ell(-12, -40, 5, 3, '#5f8a3a', false);
    // glowing cracks
    p.line([-6, -66, -2, -56, -8, -48, -3, -40], ember, 1.8);
    p.line([10, -60, 6, -50, 12, -42], ember, 1.6);
    p.glow(-3, -52, 10, ember, 0.35);
    p.poly([-20, -60, -14, -64, 20, -40, 14, -36], f.team.base);
    p.circle(4, -79, 11, c);
    p.limb([-4, -86, 13, -86], 3, shade(c, 0.3));
    glowEyes(p, [7, -80, 13, -80], 1.6, ember);
    const ax = f.atk === 2 ? 34 : f.atk === 1 ? 20 : 24;
    const ay = f.atk === 1 ? -72 : f.atk === 2 ? -44 : -36;
    p.circle(16, -60, 11, c);
    p.limb([18, -56, ax, ay], 11, c);
    p.circle(ax, ay, 9.5, c);
    p.line([ax - 4, ay - 3, ax + 1, ay + 2], ember, 1.4);
    p.c.restore();
  } },
  // summons
  lontar: { scale: 1.05, wide: true, draw: (p, f) => {
    const wood = '#93643b';
    const spin = f.walking ? f.phase * TAU * 2 : 0;
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
    p.line([-24, -14, -24, -52], '#3f2717', 1.8);
    p.poly([-24, -52, -8, -47, -24, -42], f.team.base);
    p.line([-23, -47, -13, -47], PAL.gold, 1.2);
  } },
  puppet: { scale: 1, draw: (p, f) => {
    const sway = f.walking ? f.leg * 2.5 : f.breathe * 2 - 1;
    p.c.save(); p.c.translate(sway, 0);
    p.line([0, -4, 0, -30], '#5a3e22', 2.2);
    p.glow(0, -56, 30, '#9a6ad8', 0.45);
    const d = '#2a1d28';
    p.shape((x) => {
      x.moveTo(-3, -82); x.lineTo(2, -92); x.lineTo(6, -82);
      x.quadraticCurveTo(14, -78, 16, -72); x.lineTo(7, -71);
      x.lineTo(10, -50); x.lineTo(14, -26); x.lineTo(-12, -26);
      x.lineTo(-8, -52); x.lineTo(-5, -72); x.closePath();
    }, d, f.team.base);
    for (const y of [-62, -52, -42, -34]) p.dot(0, y, 1.4, PAL.gold);
    glowEyes(p, [6, -77], 1.3, '#c49cff');
    p.line([6, -64, 22, -50], d, 2);
    p.line([22, -50, 10, -4], 'rgba(196,156,255,0.9)', 1);
    p.c.restore();
  } },
  decoy: { scale: 0.8, draw: (p, f) => {
    p.c.save();
    p.c.globalAlpha *= 0.5;
    human(p, f, {
      skin: f.team.light, top: f.team.light, bottom: f.team.light, sash: false, cape: f.team.light,
      head: (q, _f, hx, hy, r) => {
        q.circle(hx - r * 0.2, hy - r * 0.05, r, f.team.light);
        q.ell(hx - r * 0.62, hy - r * 1.35, r * 0.34, r * 0.95, f.team.light, true, -0.35);
        q.ell(hx + r * 0.08, hy - r * 1.42, r * 0.32, r * 0.92, f.team.light, true, 0.15);
        q.circle(hx + r * 0.12, hy + r * 0.08, r * 0.76, f.team.light);
        q.ell(hx + r * 0.8, hy + r * 0.35, r * 0.55, r * 0.38, f.team.light);
      },
    });
    p.c.restore();
  } },
  watchtower: { scale: 1.4, draw: (p, f) => {
    const b = '#8fb04a';
    const band = '#4f7a23';
    banded(p, -14, -2, -10, -64, 4.2, b, band, 3);
    banded(p, 14, -2, 10, -64, 4.2, b, band, 3);
    p.line([-13, -14, 12, -38], band, 2.4);
    p.line([13, -14, -12, -38], band, 2.4);
    p.rrect(-18, -68, 36, 8, 2, '#a8703c');
    for (const x of [-14, 14]) p.limb([x, -68, x, -86], 3.2, b);
    p.poly([-24, -84, 24, -84, 0, -104], '#b8955a');
    p.line([-16, -88, 16, -88], '#8a6a3a', 1.2);
    p.line([0, -104, 0, -118], '#3f2717', 1.8);
    p.poly([0, -118, 15, -113.5, 0, -109], f.team.base);
    p.dot(-12, -26, 1.6, '#d8c08a'); p.dot(12, -26, 1.6, '#d8c08a');
  } },
  // the river boss: elephant-fish under a team saddle cloth
  gajahmina: { scale: 1.7, wide: true, draw: (p, f) => {
    const c = '#4a7a84';
    const sw = f.walking ? f.leg2 * 5 : (f.breathe - 0.5) * 4;
    p.c.save(); p.c.translate(lunge(f, 6), f.bob * 0.5);
    p.shape((x) => { x.moveTo(-26, -34); x.quadraticCurveTo(-42, -40, -50, -64 + sw); x.quadraticCurveTo(-44, -50, -36, -50); x.quadraticCurveTo(-46, -36, -54, -30 - sw); x.quadraticCurveTo(-40, -26, -24, -26); x.closePath(); }, c);
    p.line([-44, -56 + sw * 0.8, -36, -44], tint(c, 0.3), 1.2);
    p.ell(-4, -32, 30, 18, c);
    for (const [x, y] of [[-18, -36], [-8, -40], [2, -36], [-12, -28], [-2, -26], [-22, -26], [8, -28]] as const) p.shape((q) => q.arc(x, y, 4, Math.PI, 0), null, '#2f5a62');
    p.shape((x) => { x.moveTo(-8, -50); x.quadraticCurveTo(-2, -64, 4, -50); x.closePath(); }, '#2f5a62');
    p.limb(legPts(-8, -18, -f.leg * 5, f.walking ? Math.max(0, f.lift) * 0.6 : 0), 9, shade(c, 0.2));
    p.limb(legPts(10, -18, f.leg * 5, f.walking ? Math.max(0, -f.lift) * 0.6 : 0), 9, c);
    caparison(p, f, -18, 6, -54, -40);
    p.ell(16, -40, 9, 14, shade(c, 0.12));
    p.circle(26, -46, 14, c);
    p.poly([18, -58, 22, -66, 26, -59, 30, -67, 33, -58], PAL.gold);
    p.bend(34, -40, 46, -30, 40, f.atk === 2 ? -36 : -14, 6, c);
    p.bend(30, -36, 40, -32, 44, -40, 3, '#f4f0e8');
    glowEyes(p, [28, -50], 1.6, '#9ef0e0');
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

const BOX = { x0: -80, x1: 80, y0: -142, y1: 24 } as const;
/** Least-recently-used bitmap cache: a figure pose is drawn once, then copied each frame. */
const cache = new Map<string, HTMLCanvasElement>();
const CACHE_CAP = 1600;

function bitmap(key: string, hb: number, dpr: number, render: (p: Pen) => void): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit); // most recently used goes last
    return hit;
  }
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
    for (const k of cache.keys()) { cache.delete(k); if (++n >= 200) break; }
  }
  cache.set(key, cv);
  return cv;
}

/** A die-cut paper standee: `draw` paints the piece and `under` its base; it gets a white cut edge and a paper shadow. */
function paperCut(p: Pen, hb: number, dpr: number, draw: (q: Pen) => void, under?: (q: Pen) => void): void {
  const edge = Math.min(3, Math.max(1.1, hb * 0.045)) * dpr;
  cutOut(p.c, edge, (c) => draw(new Pen(c, p.lw)), under ? (c) => under(new Pen(c, p.lw)) : undefined);
}

/**
 * The value pattern Valve's character art guide describes (PLAN-014): darker towards the feet,
 * lighter at the head and shoulders, so the eye goes where the character reads best. Painted over
 * the figure only (its base is drawn underneath afterwards).
 */
function valuePass(p: Pen, strength: number): void {
  const c = p.c;
  c.save();
  c.globalCompositeOperation = 'source-atop';
  const g = c.createLinearGradient(0, -104, 0, 4);
  g.addColorStop(0, `rgba(255,244,214,${0.2 * strength})`);
  g.addColorStop(0.3, 'rgba(255,244,214,0)');
  g.addColorStop(0.6, 'rgba(16,10,30,0)');
  g.addColorStop(1, `rgba(16,10,30,${0.45 * strength})`);
  c.fillStyle = g;
  c.fillRect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0);
  c.restore();
}

/** The figure's own silhouette in white, for the hit flash (cached per pose like the figure). */
function silhouette(key: string, hb: number, dpr: number, art: (p: Pen) => void): HTMLCanvasElement {
  return bitmap(`${key}|w`, hb, dpr, (p) => {
    art(p);
    p.c.save();
    p.c.globalCompositeOperation = 'source-in';
    p.c.fillStyle = '#fff6dc';
    p.c.fillRect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0);
    p.c.restore();
  });
}

function blit(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, x: number, y: number, hb: number, alpha: number): void {
  const s = hb / 100;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * alpha;
  ctx.drawImage(cv, x + BOX.x0 * s, y + BOX.y0 * s, (BOX.x1 - BOX.x0) * s, (BOX.y1 - BOX.y0) * s);
  ctx.globalAlpha = a;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Puts a cached figure on screen with its spawn rise, hit recoil and hit flash. */
function present(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, x: number, y: number, hb: number, o: FigureOpts, flash: () => HTMLCanvasElement): void {
  const alpha = o.alpha ?? 1;
  const hurt = clamp01(o.hurt ?? 0);
  const spawn = o.spawn === undefined ? 1 : clamp01(o.spawn);
  const rx = hurt > 0 ? -o.facing * hurt * hb * 0.06 : 0;
  if (spawn < 1) {
    // dust ring spreading from the base, then the figure rising out of it (a little overshoot)
    const s = hb / 100;
    ctx.save();
    ctx.globalAlpha *= (1 - spawn) * 0.85 * alpha;
    ctx.strokeStyle = '#efe2c4';
    ctx.lineWidth = Math.max(1, hb * 0.045);
    const rr = (22 + 30 * spawn) * s;
    ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.32, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#efe2c4';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.4;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr * 1.1, y + Math.sin(a) * rr * 0.36 - spawn * 6 * s, (3 - spawn * 2) * s + 0.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
    const e = 1 + 2.2 * Math.pow(spawn - 1, 3) + 1.2 * Math.pow(spawn - 1, 2); // ease-out with overshoot
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, Math.max(0.05, e)); ctx.translate(-x, -y);
    blit(ctx, cv, x, y, hb, alpha * Math.min(1, spawn * 2.5));
    ctx.restore();
  } else {
    blit(ctx, cv, x + rx, y, hb, alpha);
  }
  if (hurt > 0) blit(ctx, flash(), x + rx, y, hb, alpha * hurt * 0.85);
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
  const tr = kind === 'belang' && !!o.transformed;
  const hb = bucket(height * art.scale * (tr ? 1.12 : 1));
  const fly = !!o.flying || kind === 'layang';
  const frame = frameOf(o);
  const d = dprKey(dpr);
  const key = `h|${kind}|${owner}|${frame}|${o.facing}|${tr ? 1 : 0}|${fly ? 1 : 0}|${hb}|${d}`;
  const figure = (p: Pen) => {
    const f = poseOf(frame, owner, tr);
    p.c.save();
    if (fly) p.c.translate(0, -25 + f.flap * 2);
    p.c.scale(o.facing, 1);
    p.fx = o.facing;
    p.cel = true;
    if (art.pennant && !tr) pennant(p, f, art.pennant);
    art.draw(p, f);
    p.c.restore();
  };
  const cv = bitmap(key, hb, d, (p) => {
    const f = poseOf(frame, owner, tr);
    if (fly) p.ell(3, 2, 18, 5.5, 'rgba(16,14,34,0.3)', false);
    paperCut(p, hb, d, (q) => { figure(q); valuePass(q, 1); }, (q) => {
      if (!fly) standeeBase(q, f, 'hero', tr ? 36 : 26);
      else q.ell(0, 0, 16, 5, f.team.base, true);
    });
  });
  present(ctx, cv, x, y, hb, o, () => silhouette(key, hb, d, figure));
}

/**
 * Draws a troop or summon on (x, y). `height` is the base height in CSS px; troopScale(kind) (and
 * 0.88 for lane-wave troops) is applied here.
 */
export function drawTroopFigure(ctx: CanvasRenderingContext2D, kind: UnitKind, x: number, y: number, height: number, owner: number, dpr: number, o: FigureOpts): void {
  const art = TROOPS_ART[kind];
  const hb = bucket(height * art.scale * (o.wave ? 0.88 : 1));
  const fly = !!o.flying || kind === 'enggang' || kind === 'tebuan';
  const frame = kind === 'watchtower' ? IDLE0 : frameOf(o);
  const d = dprKey(dpr);
  const key = `t|${kind}|${owner}|${frame}|${o.facing}|${o.wave ? 1 : 0}|${fly ? 1 : 0}|${hb}|${d}`;
  const figure = (p: Pen) => {
    const f = poseOf(frame, owner, false);
    p.c.save();
    if (fly) p.c.translate(0, -25 + f.flap * 2.5);
    p.c.scale(o.facing, 1);
    p.fx = o.facing;
    p.cel = true;
    art.draw(p, f);
    p.c.restore();
  };
  const cv = bitmap(key, hb, d, (p) => {
    const f = poseOf(frame, owner, false);
    const w = art.wide ? 34 : 24;
    if (fly) p.ell(3, 2, 15, 5, 'rgba(16,14,34,0.3)', false);
    paperCut(p, hb, d, (q) => { figure(q); valuePass(q, 0.55); }, (q) => {
      if (!fly) standeeBase(q, f, kind === 'watchtower' ? 'none' : o.wave ? 'wave' : 'troop', w);
      else q.ell(0, 0, 13, 4.5, f.team.base, true);
    });
  });
  present(ctx, cv, x, y, hb, o, () => silhouette(key, hb, d, figure));
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
  const H = bucket(r * 5.4); // heroic heads are about a fifth of the figure (PLAN-014)
  const feetX = cx - art.headX * (H / 100) - r * 0.05;
  const feetY = cy + r * 0.12 - art.headY * (H / 100);
  const d = dprKey(dpr);
  const key = `p|${kind}|${owner}|${H}|${d}`;
  const cv = bitmap(key, H, d, (p) => {
    const f = { ...poseOf(IDLE0, owner, false), bust: true };
    p.cel = true;
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
