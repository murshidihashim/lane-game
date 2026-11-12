// Whole-number helpers for the game rules. No Math.sqrt/sin/cos here: every device must get
// exactly the same answers, so the simulation only uses integer + - * and truncating division.

export type Pt = readonly [number, number];

/** Integer square root: largest r with r*r <= n (n >= 0). */
export function isqrt(n: number): number {
  if (n <= 0) return 0;
  if (n < 4) return 1;
  // Integer Newton iteration from an upper bound; converges in a few steps for our ranges.
  let x = n;
  let y = idiv(x + 1, 2);
  while (y < x) {
    x = y;
    y = idiv(x + idiv(n, x), 2);
  }
  return x;
}

/** Truncating integer division (towards zero). */
export function idiv(a: number, b: number): number {
  return Math.trunc(a / b);
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function within(ax: number, ay: number, bx: number, by: number, r: number): boolean {
  return dist2(ax, ay, bx, by) <= r * r;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Scale an integer by a whole-number percentage, truncating. */
export function pct(v: number, percent: number): number {
  return idiv(v * percent, 100);
}

/** Small, fast, deterministic 32-bit random generator (mulberry32). */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  /** Next unsigned 32-bit integer. */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
  /** Integer in [0, n). */
  int(n: number): number {
    return this.next() % n;
  }
  /** True with probability percent/100. */
  chance(percent: number): boolean {
    return this.int(100) < percent;
  }
  state(): number {
    return this.s;
  }
}

/** FNV-1a style hash over a list of integers (for determinism checks). */
export function hashInts(values: readonly number[]): number {
  let h = 0x811c9dc5;
  for (const v of values) {
    h ^= v | 0;
    h = Math.imul(h, 0x01000193) >>> 0;
    h ^= Math.trunc(v / 4294967296) | 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
