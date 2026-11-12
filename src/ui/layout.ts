// Screen layout for a portrait phone (also works in a desktop browser: the game sits in a
// phone-shaped column). All sizes are CSS pixels.
import { FIELD } from '../game/map';

export interface Rect { x: number; y: number; w: number; h: number }

/** One hero's panel (DEC-011): drag the portrait to order, tap ULT to call the ultimate, tap a slot to shop. */
export interface HeroPanel {
  box: Rect;
  portrait: Rect;
  ult: Rect;
  items: Rect[];
}

export interface Layout {
  w: number; h: number; dpr: number;
  col: Rect; // the phone-shaped column
  top: Rect;
  towers: Rect; // the tower health strip in the top bar
  gear: Rect;
  field: Rect; // the drawn battlefield
  scale: number; // CSS px per world unit
  waves: Rect[]; // the lane wave chips (left, middle, right)
  heroes: [HeroPanel, HeroPanel];
  mana: Rect;
  shop: Rect;
}

export const TOP_H = 58;
const WAVE_H = 32;
const PANEL_H = 98;
const BOTTOM_H = 42;
const PAD = 8;

export function computeLayout(w: number, h: number, dpr: number): Layout {
  const cw = Math.min(w, Math.round(h * 0.62));
  const cx = Math.round((w - cw) / 2);
  const col: Rect = { x: cx, y: 0, w: cw, h };
  const hudH = PAD + WAVE_H + PANEL_H + BOTTOM_H + PAD;
  const fieldAvailH = h - TOP_H - hudH;
  const worldW = FIELD.maxX - FIELD.minX;
  const worldH = FIELD.maxY - FIELD.minY;
  const scale = Math.min((cw - 8) / worldW, fieldAvailH / worldH);
  const fw = worldW * scale;
  const fh = worldH * scale;
  const field: Rect = { x: cx + (cw - fw) / 2, y: TOP_H + (fieldAvailH - fh) / 2, w: fw, h: fh };
  const top: Rect = { x: cx, y: 0, w: cw, h: TOP_H };
  const gear: Rect = { x: cx + cw - 44, y: 0, w: 42, h: 32 };
  const towers: Rect = { x: cx + 8, y: 32, w: cw - 16, h: 20 };

  const hudY = h - hudH;
  const waveY = hudY + PAD;
  const chipW = (cw - 16 - 12) / 3;
  const waves: Rect[] = [0, 1, 2].map((i) => ({ x: cx + 8 + i * (chipW + 6), y: waveY, w: chipW, h: WAVE_H - 6 }));

  const panelY = waveY + WAVE_H;
  const panelW = (cw - 16 - 8) / 2;
  const panel = (i: number): HeroPanel => {
    const box: Rect = { x: cx + 8 + i * (panelW + 8), y: panelY, w: panelW, h: PANEL_H - 6 };
    const portrait: Rect = { x: box.x + 4, y: box.y + 4, w: 52, h: 52 };
    const slot = Math.min(26, (box.w - 70 - 8) / 3);
    const items: Rect[] = [0, 1, 2].map((k) => ({ x: box.x + 6 + k * (slot + 4), y: box.y + box.h - slot - 5, w: slot, h: slot }));
    const ult: Rect = { x: box.x + box.w - 62, y: box.y + box.h - 31, w: 58, h: 27 };
    return { box, portrait, ult, items };
  };
  const heroes: [HeroPanel, HeroPanel] = [panel(0), panel(1)];

  const bottomY = panelY + PANEL_H;
  const shop: Rect = { x: cx + cw - 8 - 104, y: bottomY + 2, w: 104, h: BOTTOM_H - 8 };
  const mana: Rect = { x: cx + 8, y: bottomY + 2, w: cw - 16 - 104 - 10, h: BOTTOM_H - 8 };
  return { w, h, dpr, col, top, towers, gear, field, scale, waves, heroes, mana, shop };
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
