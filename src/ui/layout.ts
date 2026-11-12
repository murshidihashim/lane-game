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
  field: Rect; // the drawn battlefield (the screen area; the camera decides what part of the map it shows)
  scale: number; // CSS px per world unit, at the current zoom
  baseScale: number; // CSS px per world unit with the whole map in view (zoom 1)
  vx: number; vy: number; // world point at the field's top-left corner (the camera, DEC-016)
  zoomBtn: Rect; // the zoom button in the field's corner
  waves: Rect[]; // the lane wave chips (left, middle, right)
  heroes: HeroPanel[]; // one per hero (DEC-014: three)
  mana: Rect;
  shop: Rect;
}

export const TOP_H = 58;
const WAVE_H = 32;
const PANEL_H = 120;
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
  const zoomBtn: Rect = { x: field.x + field.w - 40, y: field.y + field.h - 40, w: 34, h: 34 }; // bottom-right: clear of ultimate banners
  const top: Rect = { x: cx, y: 0, w: cw, h: TOP_H };
  const gear: Rect = { x: cx + cw - 44, y: 0, w: 42, h: 32 };
  const towers: Rect = { x: cx + 8, y: 32, w: cw - 16, h: 20 };

  const hudY = h - hudH;
  const waveY = hudY + PAD;
  const chipW = (cw - 16 - 12) / 3;
  const waves: Rect[] = [0, 1, 2].map((i) => ({ x: cx + 8 + i * (chipW + 6), y: waveY, w: chipW, h: WAVE_H - 6 }));

  // Three compact hero panels side by side: portrait and name, health, order, items, ULT.
  const panelY = waveY + WAVE_H;
  const gapP = 6;
  const panelW = (cw - 16 - gapP * 2) / 3;
  const panel = (i: number): HeroPanel => {
    const box: Rect = { x: cx + 8 + i * (panelW + gapP), y: panelY, w: panelW, h: PANEL_H - 6 };
    const portrait: Rect = { x: box.x + 3, y: box.y + 3, w: 38, h: 38 };
    const slot = Math.min(24, (box.w - 10 - 8) / 3);
    const items: Rect[] = [0, 1, 2].map((k) => ({ x: box.x + 5 + k * (slot + 4), y: box.y + 62, w: slot, h: slot }));
    const ult: Rect = { x: box.x + 5, y: box.y + box.h - 25, w: box.w - 10, h: 21 };
    return { box, portrait, ult, items };
  };
  const heroes: HeroPanel[] = [panel(0), panel(1), panel(2)];

  const bottomY = panelY + PANEL_H;
  const shop: Rect = { x: cx + cw - 8 - 104, y: bottomY + 2, w: 104, h: BOTTOM_H - 8 };
  const mana: Rect = { x: cx + 8, y: bottomY + 2, w: cw - 16 - 104 - 10, h: BOTTOM_H - 8 };
  return { w, h, dpr, col, top, towers, gear, field, scale, baseScale: scale, vx: FIELD.minX, vy: FIELD.minY, zoomBtn, waves, heroes, mana, shop };
}

/** The camera (DEC-016): zoom 1 shows the whole map; up to MAX_ZOOM, centred on a world point. */
export interface View { zoom: number; cx: number; cy: number }

export const MAX_ZOOM = 2;

/** Keep a view inside the map: zoom between 1 and MAX_ZOOM, and no empty space past the edges. */
export function clampView(base: Layout, v: View): View {
  const zoom = Math.max(1, Math.min(MAX_ZOOM, v.zoom));
  const halfW = base.field.w / (2 * base.baseScale * zoom);
  const halfH = base.field.h / (2 * base.baseScale * zoom);
  const cx = Math.max(FIELD.minX + halfW, Math.min(FIELD.maxX - halfW, v.cx));
  const cy = Math.max(FIELD.minY + halfH, Math.min(FIELD.maxY - halfH, v.cy));
  return { zoom, cx, cy };
}

/** The layout as seen through a camera view. */
export function applyView(base: Layout, v: View): Layout {
  const c = clampView(base, v);
  const scale = base.baseScale * c.zoom;
  return { ...base, scale, vx: c.cx - base.field.w / (2 * scale), vy: c.cy - base.field.h / (2 * scale) };
}

/** The whole map in view. */
export function homeView(): View {
  return { zoom: 1, cx: (FIELD.minX + FIELD.maxX) / 2, cy: (FIELD.minY + FIELD.maxY) / 2 };
}

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function toScreen(l: Layout, wx: number, wy: number): [number, number] {
  return [l.field.x + (wx - l.vx) * l.scale, l.field.y + (wy - l.vy) * l.scale];
}

export function toWorld(l: Layout, sx: number, sy: number): [number, number] {
  return [l.vx + (sx - l.field.x) / l.scale, l.vy + (sy - l.field.y) / l.scale];
}

export function inField(l: Layout, sx: number, sy: number): boolean {
  return inRect(l.field, sx, sy);
}
