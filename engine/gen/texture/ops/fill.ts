import { defineTextureOp, opField } from '../defineTextureOp.ts';
import { hexToRgb } from '../paint.ts';

export const fill = defineTextureOp({
  name: 'fill',
  doc: 'Sets every pixel to a color (and optionally a roughness). Usually the first layer.',
  fields: { color: opField.color('#808080'), rough: opField.rough() },
  apply(c, p) {
    const [r, g, b] = hexToRgb(p.color);
    c.r.fill(r);
    c.g.fill(g);
    c.b.fill(b);
    if (p.rough >= 0) c.rough.fill(p.rough);
  },
});
