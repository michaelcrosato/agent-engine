import { z } from 'zod';
import { defineTextureOp } from '../defineTextureOp.ts';
import { applyMask, styleFields } from '../maskStyle.ts';
import { smoothstep } from '../paint.ts';

export const stripes = defineTextureOp({
  name: 'stripes',
  doc: 'Parallel stripes (hazard markings at angle 45). Tileable at angles 0, 45, 90, 135.',
  fields: {
    ...styleFields('#e0b020'),
    count: z.number().int().min(1).max(128).default(4).meta({ description: 'Stripes per tile' }),
    angle: z.union([z.literal(0), z.literal(45), z.literal(90), z.literal(135)]).default(45),
    width: z.number().min(0).max(1).default(0.5).meta({ description: 'Stripe fraction of each period' }),
    softness: z.number().min(0).max(0.5).default(0.02),
  },
  apply(c, p) {
    c.each((i, u, v) => {
      const t = p.angle === 0 ? v : p.angle === 90 ? u : p.angle === 45 ? u + v : u - v + 1;
      const f = (((t * p.count) % 1) + 1) % 1;
      const m = smoothstep(0, p.softness, f) * (1 - smoothstep(p.width - p.softness, p.width, f));
      applyMask(c, i, m, p);
    });
  },
});
