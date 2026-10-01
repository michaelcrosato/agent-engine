import { z } from 'zod';
import { brickPattern } from '../brickPattern.ts';
import { defineTextureOp, opField } from '../defineTextureOp.ts';
import { applyMask, styleFields } from '../maskStyle.ts';
import { hexToRgb, paint, shade } from '../paint.ts';

export const brickFields = {
  ...styleFields('#8a4b38', 0.3),
  rows: z.number().int().min(1).max(64).default(8),
  cols: z.number().int().min(1).max(64).default(4),
  offset: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .meta({ description: 'Row shift (0.5 = running bond, 0 = grid)' }),
  gap: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.12)
    .meta({ description: 'Mortar width as a fraction of row height' }),
  bevel: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.12)
    .meta({ description: 'Edge rounding as a fraction of row height' }),
  variation: z.number().min(0).max(1).default(0.15).meta({ description: 'Per-brick brightness variation' }),
  mortar: opField.color('#5a5550', 'Gap color'),
  mortarRough: z.number().min(0).max(1).default(0.95),
};

export const bricks = defineTextureOp({
  name: 'bricks',
  doc: 'Bricks in running bond (offset 0.5) with mortar gaps, bevels, and per-brick variation.',
  fields: brickFields,
  apply(c, p, seed) {
    const base = hexToRgb(p.color);
    const mortar = hexToRgb(p.mortar);
    c.each((i, u, v) => {
      const s = brickPattern(u, v, p.rows, p.cols, p.offset, p.gap, p.bevel, seed);
      applyMask(c, i, (1 - s.mortar) * s.bevel, p, shade(base, 1 + (s.id - 0.5) * 2 * p.variation));
      paint(c, i, mortar, s.mortar * p.amount);
      c.rough[i] = c.rough[i]! + (p.mortarRough - c.rough[i]!) * s.mortar;
    });
  },
});
