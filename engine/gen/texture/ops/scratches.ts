import { z } from 'zod';
import { Rng } from '../../../core/Rng.ts';
import { defineTextureOp } from '../defineTextureOp.ts';
import { applyMask, styleFields } from '../maskStyle.ts';

export const scratches = defineTextureOp({
  name: 'scratches',
  doc: 'Thin random scratches (wraps around tile edges). Light color on metal, dark on paint.',
  fields: {
    ...styleFields('#d0d4d8', -0.05),
    count: z.number().int().min(1).max(2000).default(60),
    length: z.number().min(0.005).max(1).default(0.12).meta({ description: 'Average length in tile units' }),
    angle: z.number().default(0).meta({ description: 'Main direction in degrees' }),
    spread: z.number().min(0).max(180).default(180).meta({ description: 'Random angle range in degrees' }),
    amount: z.number().min(0).max(1).default(0.35),
  },
  apply(c, p, seed) {
    const rng = new Rng(seed);
    const s = c.size;
    for (let k = 0; k < p.count; k++) {
      const x0 = rng.next() * s;
      const y0 = rng.next() * s;
      const a = ((p.angle + rng.spread(p.spread / 2)) * Math.PI) / 180;
      const len = p.length * s * (0.5 + rng.next());
      const strength = 0.4 + rng.next() * 0.6;
      const steps = Math.ceil(len);
      for (let t = 0; t <= steps; t++) {
        const x = Math.floor(x0 + Math.cos(a) * t);
        const y = Math.floor(y0 + Math.sin(a) * t);
        const i = (((y % s) + s) % s) * s + (((x % s) + s) % s);
        applyMask(c, i, strength, p);
      }
    }
  },
});
