/**
 * Tileable noise for procedural textures. Every function takes a `period` (lattice cells per
 * tile) and wraps at it, so textures repeat seamlessly. Inputs are in [0, 1) texture space.
 */

/** Integer hash → [0, 1). */
export function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);
const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** Tileable value noise in [0, 1). `period` lattice cells span the [0, 1) texture. */
export function valueNoise(u: number, v: number, period: number, seed: number): number {
  const x = u * period;
  const y = v * period;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = smooth(x - xi);
  const fy = smooth(y - yi);
  const x0 = mod(xi, period);
  const y0 = mod(yi, period);
  const x1 = mod(xi + 1, period);
  const y1 = mod(yi + 1, period);
  const a = hash2(x0, y0, seed);
  const b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed);
  const d = hash2(x1, y1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Fractal (fBm) tileable value noise in [0, 1). Each octave doubles the period. */
export function fbm(
  u: number,
  v: number,
  period: number,
  octaves: number,
  seed: number,
  persistence = 0.5,
): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let p = period;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(u, v, p, seed + o * 101) * amp;
    norm += amp;
    amp *= persistence;
    p *= 2;
  }
  return sum / norm;
}

/** Ridged fBm in [0, 1): sharp crests, good for cracks, veins, and rock. */
export function ridged(u: number, v: number, period: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let p = period;
  for (let o = 0; o < octaves; o++) {
    const n = 1 - Math.abs(valueNoise(u, v, p, seed + o * 131) * 2 - 1);
    sum += n * n * amp;
    norm += amp;
    amp *= 0.5;
    p *= 2;
  }
  return sum / norm;
}

export type CellSample = {
  /** Distance to the nearest feature point (in cell units, ~0..1.2). */
  f1: number;
  /** Distance to the second nearest (f2 - f1 ≈ 0 on cell edges). */
  f2: number;
  /** Random id in [0, 1) of the nearest cell (for per-cell color). */
  id: number;
};

/** Tileable Worley/cellular noise with one jittered point per cell. */
export function cells(u: number, v: number, period: number, seed: number, jitter = 1): CellSample {
  const x = u * period;
  const y = v * period;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  let id = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx;
      const cy = yi + dy;
      const wx = mod(cx, period);
      const wy = mod(cy, period);
      const px = cx + 0.5 + (hash2(wx, wy, seed) - 0.5) * jitter;
      const py = cy + 0.5 + (hash2(wx, wy, seed + 7) - 0.5) * jitter;
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash2(wx, wy, seed + 13);
      } else if (d < f2) f2 = d;
    }
  }
  return { f1, f2, id };
}
