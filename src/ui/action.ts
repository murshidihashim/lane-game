// Drawing for PLAN-015 (DEC-023, DEC-024): warning rings, bamboo barricades, Spirit Eyes and snares,
// combo stamps, dash trails, and the commander call icons. Cut paper, like the rest (art-style.md).
// Drawing only; no game rules.
import type { CallId } from '../game/rules';
import type { Ent, Sim, Zone } from '../game/sim';
import { PAL } from './art';
import { type Layout, toScreen } from './layout';

const INK = PAL.ink;
const TAU = Math.PI * 2;

const RING_COLOR = { mine: PAL.gold, foe: '#e5534b', wild: '#d9772e' } as const;

/**
 * Warning rings (PLAN-015): an ultimate on its way shows its ring until it lands, filling in as the
 * moment comes; a lock-on (Duel, Coil) rings its target and draws a line from the caster. Both sides
 * see every ring: that is what makes a dodge possible.
 */
export function drawCasts(ctx: CanvasRenderingContext2D, l: Layout, sim: Sim, frac: number, now: number): void {
  for (const c of sim.casts) {
    const t = Math.min(1, Math.max(0, (sim.tick + frac - c.start) / Math.max(1, c.at - c.start)));
    const color = c.owner === 0 ? RING_COLOR.mine : c.owner === 1 ? RING_COLOR.foe : RING_COLOR.wild;
    const target = c.target ? sim.get(c.target) : undefined;
    const [x, y] = target ? toScreen(l, target.x, target.y) : toScreen(l, c.x, c.y);
    const r = Math.max(10, (target ? 60 : c.r) * l.scale);
    const pulse = 0.5 + 0.5 * Math.sin(now / 90);
    ctx.save();
    // the area fills in as the moment comes
    ctx.globalAlpha = 0.16 + 0.12 * t;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r * t, 0, TAU); ctx.fill();
    // a paper ring with a crisp shadow, dashed, turning
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(5,8,20,0.45)';
    ctx.beginPath(); ctx.arc(x + 1, y + 1.5, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.setLineDash([9, 6]);
    ctx.lineDashOffset = -now / 40;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = PAL.paperEdge;
    ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, TAU); ctx.stroke();
    if (target) {
      const k = sim.get(c.caster);
      if (k && k.alive) {
        const [kx, ky] = toScreen(l, k.x, k.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(kx, ky - 12); ctx.lineTo(x, y - 12); ctx.stroke();
        ctx.setLineDash([]);
      }
      // a reticle closing in
      const rr = r * (1.6 - 0.6 * t);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + now / 400;
        ctx.beginPath(); ctx.arc(x, y - 10, rr, a, a + 0.6); ctx.stroke();
      }
    }
    // a warning mark on enemy and wild rings
    if (c.owner !== 0) {
      ctx.globalAlpha = 0.75 + 0.25 * pulse;
      ctx.fillStyle = color;
      ctx.strokeStyle = PAL.paperEdge;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y - r - 16); ctx.lineTo(x + 9, y - r - 1); ctx.lineTo(x - 9, y - r - 1); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAL.paperEdge;
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', x, y - r - 6);
    }
    ctx.restore();
  }
}

/** A bamboo barricade (DEC-024): a short paper fence across the lane, its lashings in team colour. */
export function drawWall(ctx: CanvasRenderingContext2D, l: Layout, e: Ent, team: string, g: number): void {
  const [x, y] = toScreen(l, e.x, e.y);
  const s = g * 1.25;
  const w = Math.max(40 * g, e.r * 3 * l.scale);
  const h = 26 * g;
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,20,0.35)';
  ctx.fillRect(x - w / 2 + 2, y - 2, w, 5);
  for (let i = 0; i < 5; i++) {
    const px = x - w / 2 + (w * (i + 0.5)) / 5;
    const ph = h * (i % 2 ? 0.85 : 1);
    ctx.fillStyle = PAL.paperEdge;
    ctx.fillRect(px - 3.2 * s, y - ph - 1, 6.4 * s, ph + 2);
    ctx.fillStyle = i % 2 ? '#8fb04a' : '#7aa83a';
    ctx.fillRect(px - 2.4 * s, y - ph, 4.8 * s, ph);
    ctx.fillStyle = '#4f7a23';
    ctx.fillRect(px - 2.4 * s, y - ph * 0.55, 4.8 * s, 1.2 * s);
    ctx.beginPath(); ctx.moveTo(px - 2.4 * s, y - ph); ctx.lineTo(px, y - ph - 3 * s); ctx.lineTo(px + 2.4 * s, y - ph); ctx.fill();
  }
  ctx.fillStyle = '#a8703c';
  ctx.fillRect(x - w / 2, y - h * 0.7, w, 2.2 * s);
  ctx.fillRect(x - w / 2, y - h * 0.3, w, 2.2 * s);
  ctx.fillStyle = team;
  for (let i = 0; i < 5; i++) ctx.fillRect(x - w / 2 + (w * (i + 0.5)) / 5 - 2 * s, y - h * 0.72, 4 * s, 3 * s);
  // health
  const f = e.hp / Math.max(1, e.maxHp);
  ctx.fillStyle = 'rgba(17,26,47,0.6)';
  ctx.fillRect(x - w / 2, y - h - 9 * s, w, 3.5);
  ctx.fillStyle = team;
  ctx.fillRect(x - w / 2, y - h - 9 * s, w * f, 3.5);
  ctx.restore();
}

/** Spirit Eye (yours or one you can see) and your own snares (the enemy can't see them). */
export function drawCallZone(ctx: CanvasRenderingContext2D, l: Layout, z: Zone, tick: number, now: number): void {
  const [x, y] = toScreen(l, z.x, z.y);
  const left = (z.until - tick) / 20;
  ctx.save();
  ctx.globalAlpha = Math.min(1, left / 1.2);
  if (z.kind === 'eye') {
    ctx.strokeStyle = z.owner === 0 ? 'rgba(180,140,255,0.6)' : 'rgba(244,162,140,0.6)';
    ctx.setLineDash([2, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, z.r * l.scale, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    callIcon(ctx, 'eye', x, y, 9 + Math.sin(now / 300), z.owner === 0 ? '#e7c6ff' : '#ffd2c8');
  } else {
    ctx.strokeStyle = 'rgba(224,176,74,0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(x, y, Math.max(6, z.r * l.scale), 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    callIcon(ctx, 'snare', x, y, 6, PAL.gold);
  }
  ctx.restore();
}

/** A combo stamp (PLAN-015): "COMBO ×2" pressed onto the board like a red-ink chop, then fading. */
export function drawComboStamp(ctx: CanvasRenderingContext2D, x: number, y: number, step: number, t: number, mine: boolean): void {
  const pop = t < 0.15 ? 1.6 - (t / 0.15) * 0.6 : 1;
  ctx.save();
  ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
  ctx.translate(x, y - 34 - t * 10);
  ctx.rotate(-0.12);
  ctx.scale(pop, pop);
  const text = `COMBO ×${step + 1}`;
  ctx.font = 'bold 13px Georgia, serif';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = 'rgba(5,8,20,0.4)';
  ctx.fillRect(-w / 2 + 1.5, -10 + 2, w, 20);
  ctx.fillStyle = PAL.paperEdge;
  ctx.fillRect(-w / 2 - 2, -12, w + 4, 24);
  ctx.fillStyle = mine ? '#b8261c' : '#5a3a6a';
  ctx.fillRect(-w / 2, -10, w, 20);
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-w / 2 + 2, -8, w - 4, 16);
  ctx.fillStyle = PAL.paperEdge;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0.5);
  ctx.restore();
}

/** A dash: paper speed strips from where the hero was to where it lands. */
export function drawDashTrail(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, t: number, color: string): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const n = Math.cos(a + Math.PI / 2);
  const m = Math.sin(a + Math.PI / 2);
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.lineCap = 'round';
  for (const [o, w] of [[-6, 2.5], [0, 3.5], [6, 2.5]] as const) {
    const sx = x1 + (x2 - x1) * t * 0.5;
    const sy = y1 + (y2 - y1) * t * 0.5;
    ctx.strokeStyle = PAL.paperEdge;
    ctx.lineWidth = w + 2;
    ctx.beginPath(); ctx.moveTo(sx + n * o, sy - 10 + m * o); ctx.lineTo(x2 + n * o, y2 - 10 + m * o); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  ctx.restore();
}

/** A small paper icon for each commander call. */
export function callIcon(ctx: CanvasRenderingContext2D, id: CallId, x: number, y: number, s: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 10, s / 10);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (id) {
    case 'drum': // a war drum with lacing and a stick
      ctx.beginPath(); ctx.ellipse(0, -4, 7, 3, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-6, 6); ctx.moveTo(7, -4); ctx.lineTo(6, 6); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 6, 6, 2.4, 0, 0, Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(0, 5); ctx.lineTo(5, -1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(10, -10); ctx.stroke();
      break;
    case 'barricade': // three bamboo poles and a crossbar
      for (const px of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(px, 8); ctx.lineTo(px, -8); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(9, -2); ctx.moveTo(-9, 4); ctx.lineTo(9, 4); ctx.stroke();
      break;
    case 'eye': // a spirit eye
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(0, -9, 10, 0); ctx.quadraticCurveTo(0, 9, -10, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, TAU); ctx.fill();
      break;
    case 'remedy': // a leaf over a small bowl
      ctx.beginPath(); ctx.moveTo(-7, 2); ctx.quadraticCurveTo(0, 12, 7, 2); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-7, -6, 0, -10); ctx.quadraticCurveTo(7, -6, 0, 0); ctx.fill();
      break;
    case 'snare': // a noose of rope on a peg
      ctx.beginPath(); ctx.arc(0, 1, 6, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, -10); ctx.moveTo(-3, -10); ctx.lineTo(3, -10); ctx.stroke();
      break;
    case 'repair': // a builder's mallet
      ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(3, -2); ctx.stroke();
      ctx.save(); ctx.translate(4, -4); ctx.rotate(-Math.PI / 4); ctx.fillRect(-6, -3.5, 12, 7); ctx.restore();
      break;
  }
  ctx.restore();
}

/** A commander call button: a paper disc with the icon, its cost, and its cooldown sweeping round. */
export function drawCallButton(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, id: CallId, cost: number, cdFrac: number, can: boolean, armed: boolean, now: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,20,0.45)';
  ctx.beginPath(); ctx.arc(x + 1.2, y + 2, r + 1.5, 0, TAU); ctx.fill();
  ctx.fillStyle = PAL.paperEdge;
  ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, TAU); ctx.fill();
  ctx.fillStyle = armed ? PAL.gold : can ? '#2c3f66' : '#3a3346';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  if (cdFrac > 0) {
    ctx.fillStyle = 'rgba(10,12,24,0.6)';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * cdFrac); ctx.closePath(); ctx.fill();
  }
  if (can && cdFrac <= 0 && !armed) {
    ctx.strokeStyle = `rgba(224,176,74,${0.55 + 0.35 * Math.sin(now / 280)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r + 3, 0, TAU); ctx.stroke();
  }
  callIcon(ctx, id, x, y - 2, r * 0.55, armed ? INK : can ? PAL.parchment : '#9a8fa8');
  // cost in the corner
  ctx.fillStyle = '#7b3fb0';
  ctx.strokeStyle = PAL.paperEdge;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x + r * 0.7, y + r * 0.7, 6.5, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.paperEdge;
  ctx.font = 'bold 9px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(cost), x + r * 0.7, y + r * 0.7 + 0.5);
  ctx.restore();
}
