import { hash2 } from '../noise.ts';
import { smoothstep } from './paint.ts';

export type BrickSample = { mortar: number; bevel: number; id: number; col: number; row: number };

/**
 * Running-bond brick layout in tile space. `gap` and `bevel` are fractions of a row height.
 * Returns mortar mask (1 in gaps), bevel ramp (0 at edge → 1 inside), and a per-brick id.
 */
export function brickPattern(
  u: number,
  v: number,
  rows: number,
  cols: number,
  offset: number,
  gap: number,
  bevel: number,
  seed: number,
): BrickSample {
  const row = Math.floor(v * rows);
  const shifted = u + ((row % 2) * offset) / cols;
  const fu = shifted * cols;
  const col = ((Math.floor(fu) % cols) + cols) % cols;
  const lu = fu - Math.floor(fu);
  const lv = v * rows - row;
  const rowH = 1 / rows;
  const colW = 1 / cols;
  const d = Math.min(lu * colW, (1 - lu) * colW, lv * rowH, (1 - lv) * rowH);
  const g = (gap * rowH) / 2;
  const mortar = 1 - smoothstep(g * 0.7, g, d);
  const bev = smoothstep(g, g + bevel * rowH, d);
  return { mortar, bevel: bev, id: hash2(col, row, seed), col, row };
}
