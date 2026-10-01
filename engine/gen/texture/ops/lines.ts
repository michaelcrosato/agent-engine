import { z } from 'zod';
import { defineTextureOp } from '../defineTextureOp.ts';
import { applyMask, styleFields } from '../maskStyle.ts';
import { smoothstep } from '../paint.ts';

export const lines = defineTextureOp({
  name: 'lines',
  doc: 'Grid lines: panel seams, floor grids, or glowing neon lines (glow > 0).',
  fields: {
    ...styleFields('#1a1c20', -0.2),
    cols: z
      .number()
      .int()
      .min(0)
      .max(128)
      .default(4)
      .meta({ description: 'Vertical lines per tile (0 = none)' }),
    rows: z
      .number()
      .int()
      .min(0)
      .max(128)
      .default(4)
      .meta({ description: 'Horizontal lines per tile (0 = none)' }),
    width: z.number().min(0.0005).max(0.5).default(0.01).meta({ description: 'Line width in tile units' }),
  },
  apply(c, p) {
    c.each((i, u, v) => {
      let d = 1;
      if (p.cols) {
        const f = (u * p.cols) % 1;
        d = Math.min(d, Math.min(f, 1 - f) / p.cols);
      }
      if (p.rows) {
        const f = (v * p.rows) % 1;
        d = Math.min(d, Math.min(f, 1 - f) / p.rows);
      }
      const half = p.width / 2;
      applyMask(c, i, 1 - smoothstep(half * 0.6, half, d), p);
    });
  },
});
