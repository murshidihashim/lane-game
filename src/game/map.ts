// The battlefield: three lanes, towers, Cores and jungle camps, in whole-number world units.
// World units are the concept mockup's pixels x 10. Player 0 (you) is at the bottom, player 1
// (the opponent) at the top. Turning the map upside down, (x, y) -> (3900 - x, 6940 - y), gives
// the same map, so both players get the same field.
import { type Pt, dist2, idiv, isqrt } from './math';

export const FIELD = { minX: 0, maxX: 3900, minY: 500, maxY: 6440 } as const;
export const CENTER = { x: 1950, y: 3470 } as const;
export const RIVER = { y: 3470, halfWidth: 150 } as const;
/** Half of a lane's width. Anything further from every lane is jungle. */
export const LANE_HALF = 260;
/** Area around each Core that counts as base, not jungle. */
export const BASE_RADIUS = 900;

export type LaneId = 0 | 1 | 2;
export const LANE_NAMES = ['Left', 'Middle', 'Right'] as const;

const LEFT_LANE: Pt[] = [[1680, 6180], [1408, 6171], [1178, 6146], [986, 6102], [833, 6040], [716, 5959], [634, 5859], [586, 5740], [570, 5600], [570, 5458], [570, 5316], [570, 5174], [570, 5032], [570, 4890], [570, 4748], [570, 4606], [570, 4464], [570, 4322], [570, 4180], [570, 4038], [570, 3896], [570, 3754], [570, 3612], [570, 3470], [570, 3328], [570, 3186], [570, 3044], [570, 2902], [570, 2760], [570, 2618], [570, 2476], [570, 2334], [570, 2192], [570, 2050], [570, 1908], [570, 1766], [570, 1624], [570, 1482], [570, 1340], [586, 1200], [634, 1081], [716, 981], [833, 900], [986, 838], [1178, 794], [1408, 769], [1680, 760]];
const MID_LANE: Pt[] = [[1950, 6000], [1950, 5867], [1950, 5733], [1950, 5600], [1929, 5469], [1875, 5370], [1798, 5292], [1710, 5225], [1622, 5158], [1545, 5080], [1491, 4981], [1470, 4850], [1470, 4700], [1470, 4550], [1470, 4400], [1470, 4250], [1491, 4119], [1545, 4020], [1622, 3941], [1710, 3871], [1798, 3800], [1875, 3717], [1929, 3611], [1950, 3470], [1971, 3329], [2025, 3223], [2102, 3140], [2190, 3069], [2278, 2999], [2355, 2920], [2409, 2821], [2430, 2690], [2430, 2540], [2430, 2390], [2430, 2240], [2430, 2090], [2409, 1959], [2355, 1860], [2278, 1782], [2190, 1715], [2102, 1648], [2025, 1570], [1971, 1471], [1950, 1340], [1950, 1207], [1950, 1073], [1950, 940]];
const RIGHT_LANE: Pt[] = [[2220, 6180], [2492, 6171], [2722, 6146], [2914, 6102], [3067, 6040], [3184, 5959], [3266, 5859], [3314, 5740], [3330, 5600], [3330, 5458], [3330, 5316], [3330, 5174], [3330, 5032], [3330, 4890], [3330, 4748], [3330, 4606], [3330, 4464], [3330, 4322], [3330, 4180], [3330, 4038], [3330, 3896], [3330, 3754], [3330, 3612], [3330, 3470], [3330, 3328], [3330, 3186], [3330, 3044], [3330, 2902], [3330, 2760], [3330, 2618], [3330, 2476], [3330, 2334], [3330, 2192], [3330, 2050], [3330, 1908], [3330, 1766], [3330, 1624], [3330, 1482], [3330, 1340], [3314, 1200], [3266, 1081], [3184, 981], [3067, 900], [2914, 838], [2722, 794], [2492, 769], [2220, 760]];

export interface Lane {
  id: LaneId;
  name: string;
  /** Waypoints from player 0's Core end (s = 0) to player 1's Core end (s = length). */
  pts: Pt[];
  /** Distance along the lane at each waypoint. */
  cum: number[];
  length: number;
  /** Player 0's tower in this lane. Player 1's tower is the same spot turned upside down. */
  tower0: Pt;
  /** Distance along the lane of player 0's tower. */
  towerS: number;
}

function makeLane(id: LaneId, pts: Pt[], tower0: Pt): Lane {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + isqrt(dist2(pts[i][0], pts[i][1], pts[i - 1][0], pts[i - 1][1])));
  }
  const lane: Lane = { id, name: LANE_NAMES[id], pts, cum, length: cum[cum.length - 1], tower0, towerS: 0 };
  lane.towerS = nearestS(lane, tower0[0], tower0[1]);
  return lane;
}

/** Point on the lane at distance s from player 0's end. */
export function pointAt(lane: Lane, s: number): Pt {
  const { pts, cum } = lane;
  if (s <= 0) return pts[0];
  if (s >= lane.length) return pts[pts.length - 1];
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const a = pts[i - 1];
  const b = pts[i];
  const seg = cum[i] - cum[i - 1];
  const t = s - cum[i - 1];
  if (seg === 0) return a;
  return [a[0] + idiv((b[0] - a[0]) * t, seg), a[1] + idiv((b[1] - a[1]) * t, seg)];
}

/** Direction of the lane at distance s, as an unnormalised vector towards player 1's end. */
export function directionAt(lane: Lane, s: number): Pt {
  const { pts, cum } = lane;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  return [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]];
}

/** Closest point on segment a-b to p, and its squared distance. */
function closestOnSegment(px: number, py: number, a: Pt, b: Pt): { x: number; y: number; d2: number; num: number; den: number } {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const den = vx * vx + vy * vy;
  let num = (px - a[0]) * vx + (py - a[1]) * vy;
  if (den === 0 || num <= 0) num = 0;
  else if (num >= den) num = den;
  const x = den === 0 ? a[0] : a[0] + idiv(vx * num, den);
  const y = den === 0 ? a[1] : a[1] + idiv(vy * num, den);
  return { x, y, d2: dist2(px, py, x, y), num, den };
}

/** Distance along the lane of the lane point closest to (x, y). */
export function nearestS(lane: Lane, x: number, y: number): number {
  let best = Infinity;
  let bestS = 0;
  for (let i = 1; i < lane.pts.length; i++) {
    const c = closestOnSegment(x, y, lane.pts[i - 1], lane.pts[i]);
    if (c.d2 < best) {
      best = c.d2;
      const seg = lane.cum[i] - lane.cum[i - 1];
      bestS = lane.cum[i - 1] + (c.den === 0 ? 0 : idiv(seg * c.num, c.den));
    }
  }
  return bestS;
}

/** Squared distance from (x, y) to the lane's centre line. */
export function laneDist2(lane: Lane, x: number, y: number): number {
  let best = Infinity;
  for (let i = 1; i < lane.pts.length; i++) {
    const d = closestOnSegment(x, y, lane.pts[i - 1], lane.pts[i]).d2;
    if (d < best) best = d;
  }
  return best;
}

/** Turn a point upside down (player 0's view <-> player 1's view). */
export function rotate(p: Pt): Pt {
  return [CENTER.x * 2 - p[0], CENTER.y * 2 - p[1]];
}

export const LANES: readonly Lane[] = [
  makeLane(0, LEFT_LANE, [570, 5340]),
  makeLane(1, MID_LANE, [1950, 5730]),
  makeLane(2, RIGHT_LANE, [3330, 5340]),
];

export const CORES: readonly [Pt, Pt] = [[1950, 6210], [1950, 730]];
/** River fruit groves (neutral camps that pay Semangat). */
export const CAMPS: readonly Pt[] = [[1260, 3470], [2640, 3470]];
/** Beast dens: one deeper in each side's jungle (player 0's first). Clearing one gives Jungle Fury. */
export const DENS: readonly Pt[] = [[2600, 4700], [1300, 2240]];
/** Gajah Mina, the river boss, sits under the middle bridge. */
export const BOSS_PIT: Pt = [1950, 3470];
/** Ward spots: three in each half (player 0's half first). */
export const WARD_SPOTS: readonly Pt[] = [[1050, 4200], [2500, 3900], [2900, 5300], [2850, 2740], [1400, 3040], [1000, 1640]];
/** Relic shrines: two in each half. Relics appear in pairs, one in each half. */
export const SHRINES: readonly Pt[] = [[1000, 5000], [2900, 3900], [2900, 1940], [1000, 3040]];

export function activeLanes(laneCount: 2 | 3): LaneId[] {
  return laneCount === 3 ? [0, 1, 2] : [0, 2];
}

/** Tower position for a player in a lane. */
export function towerPos(lane: Lane, player: 0 | 1): Pt {
  return player === 0 ? lane.tower0 : rotate(LANES[2 - lane.id].tower0);
}

/** Convert "distance from this player's own end" to distance from player 0's end. */
export function uToS(lane: Lane, player: 0 | 1, u: number): number {
  return player === 0 ? u : lane.length - u;
}

/** True if (x, y) is in the jungle: away from every active lane and outside both bases. */
export function inJungle(x: number, y: number, lanes: readonly LaneId[]): boolean {
  for (const c of CORES) if (dist2(x, y, c[0], c[1]) <= BASE_RADIUS * BASE_RADIUS) return false;
  const limit = (LANE_HALF + 30) * (LANE_HALF + 30);
  for (const id of lanes) if (laneDist2(LANES[id], x, y) <= limit) return false;
  return true;
}
