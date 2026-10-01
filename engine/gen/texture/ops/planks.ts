import { z } from 'zod';
import { fbm, hash2 } from '../../noise.ts';
import { defineTextureOp, opField } from '../defineTextureOp.ts';
import { applyMask, styleFields } from '../maskStyle.ts';
import { hexToRgb, paint, shade, smoothstep } from '../paint.ts';

export const planks = defineTextureOp({
  name: 'planks',
  doc: 'Wooden boards with grain, staggered end seams, and per-board tone. Boards run along U.',
  fields: {
    ...styleFields('#8a5a32', 0.15),
    count: z.number().int().min(1).max(64).default(6).meta({ description: 'Boards per tile' }),
    gap: z
      .number()
      .min(0)
      .max(0.5)
      .default(0.08)
      .meta({ description: 'Seam width as a fraction of board width' }),
    grain: z.number().min(0).max(1).default(0.5),
    variation: z.number().min(0).max(1).default(0.2),
    seamColor: opField.color('#2a1a10'),
  },
  apply(c, p, seed) {
    const base = hexToRgb(p.color);
    const seam = hexToRgb(p.seamColor);
    c.each((i, u, v) => {
      const row = Math.floor(v * p.count);
      const lv = v * p.count - row;
      const cut = hash2(row, 1, seed);
      const lu = (u + cut) % 1;
      const dv = Math.min(lv, 1 - lv) / p.count;
      const du = Math.min(lu, 1 - lu);
      const g = (p.gap / p.count) * 0.5;
      const m = 1 - smoothstep(g * 0.6, g, Math.min(dv, du));
      const grain = fbm(u, (v * p.count * 4) % 1, 6, 3, seed + row);
      const tone = 1 + (hash2(row, 2, seed) - 0.5) * 2 * p.variation + (grain - 0.5) * p.grain;
      applyMask(c, i, 1 - m, p, shade(base, tone));
      paint(c, i, seam, m * p.amount);
      c.height[i] = c.height[i]! - m * 0.3;
    });
  },
});
