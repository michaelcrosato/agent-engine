import { z } from 'zod';
import { defineTextureOp } from '../defineTextureOp.ts';
import { applyMask, styleFields } from '../maskStyle.ts';

export const checker = defineTextureOp({
  name: 'checker',
  doc: 'Checkerboard: debug floors, retro tiles, race flags.',
  fields: { ...styleFields('#202020'), cells: z.number().int().min(1).max(128).default(8) },
  apply(c, p) {
    c.each((i, u, v) => {
      const m = (Math.floor(u * p.cells) + Math.floor(v * p.cells)) % 2;
      applyMask(c, i, m, p);
    });
  },
});
