import { z } from 'zod';
import { defineTextureOp } from '../defineTextureOp.ts';
import { brickFields, bricks } from './bricks.ts';

export const tiles = defineTextureOp({
  name: 'tiles',
  doc: 'Square grid tiles with grout: floors, panels, bathroom walls (bricks with offset 0).',
  fields: {
    ...brickFields,
    color: brickFields.color.default('#9aa0a6'),
    rows: z.number().int().min(1).max(64).default(4),
    cols: z.number().int().min(1).max(64).default(4),
    offset: z.number().min(0).max(1).default(0),
    gap: z.number().min(0).max(0.5).default(0.06),
    bevel: z.number().min(0).max(0.5).default(0.05),
    variation: z.number().min(0).max(1).default(0.08),
    mortar: brickFields.mortar.default('#3c3f44'),
  },
  apply(c, p, seed) {
    bricks.apply(c, p, seed);
  },
});
