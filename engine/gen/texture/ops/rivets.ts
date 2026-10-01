import { z } from 'zod';
import { defineTextureOp } from '../defineTextureOp.ts';
import { applyMask, styleFields } from '../maskStyle.ts';
import { smoothstep } from '../paint.ts';

export const rivets = defineTextureOp({
  name: 'rivets',
  doc: 'Round bolts near the corners of each panel cell (pair with tiles or lines).',
  fields: {
    ...styleFields('#b0b4ba', 0.5),
    cols: z.number().int().min(1).max(64).default(4),
    rows: z.number().int().min(1).max(64).default(4),
    inset: z
      .number()
      .min(0)
      .max(0.5)
      .default(0.1)
      .meta({ description: 'Distance from cell corner (cell units)' }),
    radius: z.number().min(0.001).max(0.2).default(0.012).meta({ description: 'Rivet radius in tile units' }),
  },
  apply(c, p) {
    c.each((i, u, v) => {
      const fu = (u * p.cols) % 1;
      const fv = (v * p.rows) % 1;
      const cu = Math.abs(fu - 0.5) > 0.5 - p.inset - 0.05 ? (fu < 0.5 ? p.inset : 1 - p.inset) : -9;
      const cv = Math.abs(fv - 0.5) > 0.5 - p.inset - 0.05 ? (fv < 0.5 ? p.inset : 1 - p.inset) : -9;
      if (cu < -1 || cv < -1) return;
      const d = Math.hypot((fu - cu) / p.cols, (fv - cv) / p.rows);
      const m = 1 - smoothstep(p.radius * 0.7, p.radius, d);
      applyMask(c, i, m, p);
    });
  },
});
