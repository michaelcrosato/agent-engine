import { z } from 'zod';
import { opField } from './defineTextureOp.ts';
import { BLENDS, hexToRgb, paint } from './paint.ts';
import type { TexCanvas } from './TexCanvas.ts';

/** Common "how to paint the pattern" fields shared by most ops. */
export function styleFields(color: string, height = 0) {
  return {
    color: opField.color(color),
    amount: opField.amount(),
    blend: z.enum(BLENDS).default('mix').meta({ description: 'How the color combines with what is below' }),
    height: opField.height(height),
    rough: opField.rough(),
    glow: opField.glow(),
  };
}

export type MaskStyle = {
  color: string;
  amount: number;
  blend: (typeof BLENDS)[number];
  height: number;
  rough: number;
  glow: number;
};

/** Applies a pattern mask value m (0..1) at pixel i using a style. */
export function applyMask(c: TexCanvas, i: number, m: number, s: MaskStyle, rgb = hexToRgb(s.color)): void {
  if (m <= 0) return;
  paint(c, i, rgb, m * s.amount, s.blend);
  c.height[i] = c.height[i]! + m * s.height;
  if (s.rough >= 0) c.rough[i] = c.rough[i]! + (s.rough - c.rough[i]!) * m;
  if (s.glow > 0) c.glow[i] = Math.max(c.glow[i]!, m * s.glow);
}
