import { z } from 'zod';
import { Rng } from '../../../core/Rng.ts';
import { defineTextureOp } from '../defineTextureOp.ts';
import { applyMask, styleFields } from '../maskStyle.ts';
import { smoothstep } from '../paint.ts';

export const spots = defineTextureOp({
  name: 'spots',
  doc: 'Random round spots: rust patches, holes, paint drops, stars. Wraps at tile edges.',
  fields: {
    ...styleFields('#6b3a1e'),
    count: z.number().int().min(1).max(5000).default(30),
    radius: z.number().min(0.001).max(0.5).default(0.03).meta({ description: 'Radius in tile units' }),
    variation: z.number().min(0).max(1).default(0.5).meta({ description: 'Random radius variation' }),
    softness: z.number().min(0).max(1).default(0.5),
  },
  apply(c, p, seed) {
    const rng = new Rng(seed);
    const s = c.size;
    for (let k = 0; k < p.count; k++) {
      const cx = rng.next();
      const cy = rng.next();
      const r = p.radius * (1 - p.variation * rng.next());
      const rp = Math.ceil(r * s) + 1;
      const px = Math.floor(cx * s);
      const py = Math.floor(cy * s);
      for (let dy = -rp; dy <= rp; dy++) {
        for (let dx = -rp; dx <= rp; dx++) {
          const d = Math.hypot(dx, dy) / s;
          const m = 1 - smoothstep(r * (1 - p.softness), r, d);
          if (m <= 0) continue;
          const x = (((px + dx) % s) + s) % s;
          const y = (((py + dy) % s) + s) % s;
          applyMask(c, i2(x, y, s), m, p);
        }
      }
    }
  },
});

const i2 = (x: number, y: number, s: number): number => y * s + x;
