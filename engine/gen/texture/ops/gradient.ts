import { z } from 'zod';
import { defineTextureOp, opField } from '../defineTextureOp.ts';
import { hexToRgb, paint } from '../paint.ts';

export const gradient = defineTextureOp({
  name: 'gradient',
  doc: 'Linear color ramp across the tile (not seamless: for screens, signs, skies).',
  fields: {
    from: opField.color('#000000'),
    to: opField.color('#ffffff'),
    axis: z.enum(['u', 'v']).default('v'),
    amount: opField.amount(),
  },
  apply(c, p) {
    const a = hexToRgb(p.from);
    const b = hexToRgb(p.to);
    c.each((i, u, v) => {
      const t = p.axis === 'u' ? u : v;
      paint(c, i, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], p.amount);
    });
  },
});
