import { z } from 'zod';
import { cells as cellNoise } from '../../noise.ts';
import { defineTextureOp, opField } from '../defineTextureOp.ts';
import { applyMask, styleFields } from '../maskStyle.ts';
import { hexToRgb, paint, shade, smoothstep } from '../paint.ts';

export const cells = defineTextureOp({
  name: 'cells',
  doc: 'Voronoi cells: flagstones, scales, cracked ground. Each cell gets a brightness variation.',
  fields: {
    ...styleFields('#777777', 0.2),
    scale: z.number().int().min(1).max(64).default(6),
    jitter: z.number().min(0).max(1).default(0.9),
    variation: z.number().min(0).max(1).default(0.25).meta({ description: 'Per-cell brightness variation' }),
    edge: z.number().min(0).max(1).default(0.08).meta({ description: 'Edge (crack) width in cell units' }),
    edgeColor: opField.color('#222222'),
    edgeHeight: opField.height(-0.3),
  },
  apply(c, p, seed) {
    const edgeRgb = hexToRgb(p.edgeColor);
    const base = hexToRgb(p.color);
    c.each((i, u, v) => {
      const s = cellNoise(u, v, p.scale, seed, p.jitter);
      const e = 1 - smoothstep(0, p.edge, s.f2 - s.f1);
      applyMask(c, i, 1 - e, p, shade(base, 1 + (s.id - 0.5) * 2 * p.variation));
      paint(c, i, edgeRgb, e * p.amount);
      c.height[i] = c.height[i]! + e * p.edgeHeight;
    });
  },
});
