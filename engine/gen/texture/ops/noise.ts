import { z } from 'zod';
import { fbm, ridged, valueNoise } from '../../noise.ts';
import { defineTextureOp } from '../defineTextureOp.ts';
import { applyMask, styleFields } from '../maskStyle.ts';
import { smoothstep } from '../paint.ts';

export const noise = defineTextureOp({
  name: 'noise',
  doc: 'Tileable noise painted as a mask: grain, stains, rock variation. threshold > 0 makes blobs.',
  fields: {
    ...styleFields('#000000'),
    kind: z.enum(['fbm', 'ridged', 'value']).default('fbm'),
    scale: z
      .number()
      .int()
      .min(1)
      .max(128)
      .default(8)
      .meta({ description: 'Noise cells per tile (integer, keeps it tileable)' }),
    octaves: z.number().int().min(1).max(8).default(4),
    threshold: z
      .number()
      .min(0)
      .max(1)
      .default(0)
      .meta({ description: '0 = smooth mask; >0 = blobs above this value' }),
    softness: z.number().min(0.001).max(1).default(0.08),
    invert: z.boolean().default(false),
    amount: z.number().min(0).max(1).default(0.3),
  },
  apply(c, p, seed) {
    c.each((i, u, v) => {
      let n =
        p.kind === 'ridged'
          ? ridged(u, v, p.scale, p.octaves, seed)
          : p.kind === 'value'
            ? valueNoise(u, v, p.scale, seed)
            : fbm(u, v, p.scale, p.octaves, seed);
      if (p.invert) n = 1 - n;
      if (p.threshold > 0) n = smoothstep(p.threshold - p.softness, p.threshold + p.softness, n);
      const h = p.height;
      applyMask(c, i, n, { ...p, height: 0 });
      c.height[i] = c.height[i]! + (n - 0.5) * h;
    });
  },
});
