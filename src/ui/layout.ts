// Screen layout for a portrait phone (also works in a desktop browser: the game sits in a
// phone-shaped column). All sizes are CSS pixels.
import { FIELD } from '../game/map';

export interface Rect { x: number; y: number; w: number; h: number }

/** One hero's panel (DEC-011): drag the portrait to order, tap ULT to call the ultimate (or drag it
 *  onto the map to aim it, PLAN-015), tap a slot to shop, tap the Power gem to fire it on cue, and
 *  tap the level badge to choose an upgrade. */
export interface HeroPanel {
  box: Rect;
  portrait: Rect;
  ult: Rect;
  items: Rect[];
  power: Rect; // the Power gem (PLAN-015)
  badge: Rect; // the level badge; it glows when an upgrade choice waits (PLAN-015)
}

/** Hero orders (DEC-021): the ring of orders round the thumb, and while aiming an order, a hint
 *  strip with Cancel that takes the lane-chip row's place, so nothing covers the map. */
export interface CommandMenu {
  ringR: number; // from the ring's centre to each order's centre
  iconR: number; // each order's paper disc
  hint: Rect;
  cancel: Rect;
}

export interface Layout {
  w: number; h: number; dpr: number;
  col: Rect; // the phone-shaped column
  top: Rect;
  towers: Rect; // the tower health strip in the top bar
  gear: Rect;
  field: Rect; // the battlefield's screen area, the full column width (the camera decides what part of the map it shows)
  scale: number; // CSS px per world unit, at the current zoom
  baseScale: number; // CSS px per world unit with the whole map in view (zoom 1, the overview)
  homeScale: number; // CSS px per world unit with the map's width filling the screen (the usual view, DEC-019)
  vx: number; vy: number; // world point at the field's top-left corner (the camera, DEC-016)
  zoomBtn: Rect; // the zoom button in the field's corner
  waves: Rect[]; // the lane wave chips (left, middle, right)
  holds: Rect[]; // each chip's hold / release toggle (rally the waves, PLAN-015)
  calls: Rect[]; // the two commander call buttons (DEC-024)
  heroes: HeroPanel[]; // one per hero (DEC-014: three)
  mana: Rect;
  shop: Rect;
  menu: CommandMenu;
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
  // The field takes the whole column width and all the height between the top bar and the HUD (DEC-019).
  const field: Rect = { x: cx, y: TOP_H, w: cw, h: fieldAvailH };
  const scale = Math.min(cw / worldW, fieldAvailH / worldH); // the whole map (overview)
  const homeScale = cw / worldW; // the map's width fills the screen
  const zoomBtn: Rect = { x: field.x + field.w - 40, y: field.y + field.h - 40, w: 34, h: 34 }; // bottom-right: clear of ultimate banners
  const top: Rect = { x: cx, y: 0, w: cw, h: TOP_H };
  const gear: Rect = { x: cx + cw - 44, y: 0, w: 42, h: 32 };
  const towers: Rect = { x: cx + 8, y: 32, w: cw - 16, h: 20 };

  const hudY = h - hudH;
  const waveY = hudY + PAD;
  const chipW = (cw - 16 - 12) / 3;
  const waves: Rect[] = [0, 1, 2].map((i) => ({ x: cx + 8 + i * (chipW + 6), y: waveY, w: chipW, h: WAVE_H - 6 }));
  const holds: Rect[] = waves.map((r) => ({ x: r.x + r.w - 25, y: r.y + 2, w: 23, h: r.h - 4 }));

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
    const gemX = items[2].x + items[2].w + 3;
    const gemW = Math.max(18, box.x + box.w - 3 - gemX);
    const power: Rect = { x: gemX, y: items[0].y - 2, w: gemW, h: slot + 4 };
    const badge: Rect = { x: portrait.x + portrait.w + 2, y: box.y + 21, w: box.w - portrait.w - 10, h: 15 };
    return { box, portrait, ult, items, power, badge };
  };
  const heroes: HeroPanel[] = [panel(0), panel(1), panel(2)];

  // The order ring (DEC-021) and the aiming hint, which sits where the lane chips are.
  const menu: CommandMenu = {
    ringR: 64,
    iconR: 19,
    hint: { x: cx + 8, y: waveY, w: cw - 16, h: WAVE_H - 6 },
    cancel: { x: cx + cw - 8 - 78, y: waveY, w: 78, h: WAVE_H - 6 },
  };

  const bottomY = panelY + PANEL_H;
  const shopW = cw < 360 ? 78 : 92;
  const shop: Rect = { x: cx + cw - 8 - shopW, y: bottomY + 2, w: shopW, h: BOTTOM_H - 8 };
  // two commander call buttons between Semangat and the Shop (DEC-024)
  const callW = BOTTOM_H - 6;
  const calls: Rect[] = [0, 1].map((i) => ({ x: shop.x - 6 - (2 - i) * (callW + 5), y: bottomY + 1, w: callW, h: callW }));
  const mana: Rect = { x: cx + 8, y: bottomY + 2, w: calls[0].x - 8 - (cx + 8), h: BOTTOM_H - 8 };
  const vx = (FIELD.minX + FIELD.maxX) / 2 - field.w / (2 * scale);
  const vy = (FIELD.minY + FIELD.maxY) / 2 - field.h / (2 * scale);
  return { w, h, dpr, col, top, towers, gear, field, scale, baseScale: scale, homeScale, vx, vy, zoomBtn, waves, holds, calls, heroes, mana, shop, menu };
}

/** The level-up choice card (PLAN-015): just above the lane chips, two options side by side. */
export function choiceCard(l: Layout): { box: Rect; opts: [Rect, Rect] } {
  const h = 92;
  const box: Rect = { x: l.col.x + 8, y: l.waves[0].y - 8 - h, w: l.col.w - 16, h };
  const ow = (box.w - 18) / 2;
  const opts: [Rect, Rect] = [
    { x: box.x + 6, y: box.y + 26, w: ow, h: h - 32 },
    { x: box.x + 12 + ow, y: box.y + 26, w: ow, h: h - 32 },
  ];
  return { box, opts };
}

/**
 * The camera (DEC-016, DEC-019), centred on a world point. Zoom is relative to the overview:
 * zoom 1 shows the whole map; the usual (home) view fills the screen's width (homeZoom); maxZoom
 * goes closer still.
 */
export interface View { zoom: number; cx: number; cy: number }

/** The zoom at which the map's width fills the screen (1 when the whole map already fits). */
export function homeZoom(base: Layout): number {
  return base.homeScale / base.baseScale;
}

export function maxZoom(base: Layout): number {
  return Math.max(2, homeZoom(base) * 2);
}

/** Keep a view inside the map: zoom between 1 and maxZoom; no empty space past an edge, and a map
 *  narrower (or shorter) than the screen sits in the middle. */
export function clampView(base: Layout, v: View): View {
  const zoom = Math.max(1, Math.min(maxZoom(base), v.zoom));
  const halfW = base.field.w / (2 * base.baseScale * zoom);
  const halfH = base.field.h / (2 * base.baseScale * zoom);
  const fit = (c: number, lo: number, hi: number, half: number) => (half * 2 >= hi - lo ? (lo + hi) / 2 : Math.max(lo + half, Math.min(hi - half, c)));
  return { zoom, cx: fit(v.cx, FIELD.minX, FIELD.maxX, halfW), cy: fit(v.cy, FIELD.minY, FIELD.maxY, halfH) };
}

/** The layout as seen through a camera view. */
export function applyView(base: Layout, v: View): Layout {
  const c = clampView(base, v);
  const scale = base.baseScale * c.zoom;
  return { ...base, scale, vx: c.cx - base.field.w / (2 * scale), vy: c.cy - base.field.h / (2 * scale) };
}

/** The usual view (DEC-019): the map's width fills the screen, looking at your own side (the bottom). */
export function homeView(base: Layout): View {
  return clampView(base, { zoom: homeZoom(base), cx: (FIELD.minX + FIELD.maxX) / 2, cy: FIELD.maxY });
}

/** The whole map in view. */
export function overviewView(): View {
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

// ---------- the order ring (DEC-021) ----------

const clampTo = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Where the ring goes: round a point on the map (kept on screen), or just above a hero's panel. */
export function ringCenter(l: Layout, x: number, y: number, abovePanel: Rect | null): [number, number] {
  const m = l.menu.ringR + l.menu.iconR + 6;
  if (abovePanel) {
    return [clampTo(abovePanel.x + abovePanel.w / 2, l.col.x + m, l.col.x + l.col.w - m), Math.max(l.field.y + m, abovePanel.y - l.menu.ringR - 6)];
  }
  return [clampTo(x, l.col.x + m, l.col.x + l.col.w - m), clampTo(y, l.field.y + m, l.h - m)];
}

/** The centre of ring slot i of n (slot 0 at the top, then clockwise). */
export function ringSlot(l: Layout, cx: number, cy: number, i: number, n: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [cx + Math.cos(a) * l.menu.ringR, cy + Math.sin(a) * l.menu.ringR];
}

/** The ring slot under a point (within a little of its disc), or null. */
export function ringSlotAt(l: Layout, cx: number, cy: number, x: number, y: number, n: number): number | null {
  const reach = (l.menu.iconR + 9) ** 2;
  let best: number | null = null;
  let bestD = reach;
  for (let i = 0; i < n; i++) {
    const [sx, sy] = ringSlot(l, cx, cy, i, n);
    const d = (sx - x) ** 2 + (sy - y) ** 2;
    if (d <= bestD) { bestD = d; best = i; }
  }
  return best;
}
