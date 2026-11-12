// Screen layout for a portrait phone (also works in a desktop browser: the game sits in a
// phone-shaped column). All sizes are CSS pixels.
import { FIELD } from '../game/map';

export interface Rect { x: number; y: number; w: number; h: number }

export interface Layout {
  w: number; h: number; dpr: number;
  col: Rect; // the phone-shaped column
  top: Rect;
  gear: Rect;
  field: Rect; // the drawn battlefield
  scale: number; // CSS px per world unit
  heroSlots: [Rect, Rect];
  heroInfo: Rect;
  next: Rect;
  cards: Rect[];
  mana: Rect;
}

export const TOP_H = 40;
const HERO_H = 50;
const CARD_H = 86;
const MANA_H = 26;
const PAD = 8;

export function computeLayout(w: number, h: number, dpr: number): Layout {
  const cw = Math.min(w, Math.round(h * 0.62));
  const cx = Math.round((w - cw) / 2);
  const col: Rect = { x: cx, y: 0, w: cw, h };
  const hudH = HERO_H + CARD_H + MANA_H + PAD * 2;
  const fieldAvailH = h - TOP_H - hudH;
  const worldW = FIELD.maxX - FIELD.minX;
  const worldH = FIELD.maxY - FIELD.minY;
  const scale = Math.min((cw - 8) / worldW, fieldAvailH / worldH);
  const fw = worldW * scale;
  const fh = worldH * scale;
  const field: Rect = { x: cx + (cw - fw) / 2, y: TOP_H + (fieldAvailH - fh) / 2, w: fw, h: fh };
  const top: Rect = { x: cx, y: 0, w: cw, h: TOP_H };
  const gear: Rect = { x: cx + cw - 44, y: 2, w: 40, h: TOP_H - 4 };

  const hudY = h - hudH;
  const heroY = hudY + PAD;
  const heroSlots: [Rect, Rect] = [
    { x: cx + 10, y: heroY, w: 50, h: HERO_H - 4 },
    { x: cx + 66, y: heroY, w: 50, h: HERO_H - 4 },
  ];
  const heroInfo: Rect = { x: cx + 124, y: heroY, w: cw - 134, h: HERO_H - 4 };
  const cardY = heroY + HERO_H;
  const nextW = Math.min(46, cw * 0.12);
  const next: Rect = { x: cx + 8, y: cardY + 18, w: nextW, h: CARD_H - 30 };
  const cardsX = next.x + nextW + 8;
  const gap = 6;
  const cardW = (cx + cw - 8 - cardsX - gap * 3) / 4;
  const cards: Rect[] = [0, 1, 2, 3].map((i) => ({ x: cardsX + i * (cardW + gap), y: cardY, w: cardW, h: CARD_H - 6 }));
  const mana: Rect = { x: cardsX, y: cardY + CARD_H, w: cx + cw - 8 - cardsX, h: 16 };
  return { w, h, dpr, col, top, gear, field, scale, heroSlots, heroInfo, next, cards, mana };
}

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function toScreen(l: Layout, wx: number, wy: number): [number, number] {
  return [l.field.x + (wx - FIELD.minX) * l.scale, l.field.y + (wy - FIELD.minY) * l.scale];
}

export function toWorld(l: Layout, sx: number, sy: number): [number, number] {
  return [FIELD.minX + (sx - l.field.x) / l.scale, FIELD.minY + (sy - l.field.y) / l.scale];
}

export function inField(l: Layout, sx: number, sy: number): boolean {
  return inRect(l.field, sx, sy);
}
