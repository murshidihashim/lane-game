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

/** The hero command menu (DEC-017): a header, eight order buttons, and a hint strip with Cancel. */
export interface CommandMenu {
  box: Rect;
  close: Rect;
  buttons: Rect[]; // in COMMAND_ORDERS order
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

  // The command menu sits over the bottom of the map, just above the wave chips.
  const menuH = 128;
  const mBox: Rect = { x: cx + 8, y: hudY - menuH - 4, w: cw - 16, h: menuH };
  const bw = (mBox.w - 10 - 3 * 6) / 4;
  const menu: CommandMenu = {
    box: mBox,
    close: { x: mBox.x + mBox.w - 34, y: mBox.y + 3, w: 30, h: 26 },
    buttons: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ x: mBox.x + 5 + (i % 4) * (bw + 6), y: mBox.y + 32 + Math.floor(i / 4) * 48, w: bw, h: 44 })),
    hint: { x: cx + 8, y: hudY - 46, w: cw - 16, h: 40 },
    cancel: { x: cx + cw - 8 - 86, y: hudY - 42, w: 82, h: 32 },
  };

  const bottomY = panelY + PANEL_H;
  const shop: Rect = { x: cx + cw - 8 - 104, y: bottomY + 2, w: 104, h: BOTTOM_H - 8 };
  const mana: Rect = { x: cx + 8, y: bottomY + 2, w: cw - 16 - 104 - 10, h: BOTTOM_H - 8 };
  const vx = (FIELD.minX + FIELD.maxX) / 2 - field.w / (2 * scale);
  const vy = (FIELD.minY + FIELD.maxY) / 2 - field.h / (2 * scale);
  return { w, h, dpr, col, top, towers, gear, field, scale, baseScale: scale, homeScale, vx, vy, zoomBtn, waves, heroes, mana, shop, menu };
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
