import type { TexCanvas } from './TexCanvas.ts';

export type Blend = 'mix' | 'multiply' | 'add' | 'screen' | 'overlay';
export const BLENDS = ['mix', 'multiply', 'add', 'screen', 'overlay'] as const;
export type Rgb = [number, number, number];

/** Parses "#rgb" or "#rrggbb" to 0..1 floats. */
export function hexToRgb(hex: string): Rgb {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = Number.parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const blend1 = (base: number, top: number, mode: Blend): number => {
  switch (mode) {
    case 'multiply':
      return base * top;
    case 'add':
      return Math.min(1, base + top);
    case 'screen':
      return 1 - (1 - base) * (1 - top);
    case 'overlay':
      return base < 0.5 ? 2 * base * top : 1 - 2 * (1 - base) * (1 - top);
    default:
      return top;
  }
};

/** Blends `rgb` into pixel `i` with strength `alpha` (0..1). */
export function paint(c: TexCanvas, i: number, rgb: Rgb, alpha: number, mode: Blend = 'mix'): void {
  if (alpha <= 0) return;
  const a = Math.min(1, alpha);
  c.r[i] = c.r[i]! + (blend1(c.r[i]!, rgb[0], mode) - c.r[i]!) * a;
  c.g[i] = c.g[i]! + (blend1(c.g[i]!, rgb[1], mode) - c.g[i]!) * a;
  c.b[i] = c.b[i]! + (blend1(c.b[i]!, rgb[2], mode) - c.b[i]!) * a;
}

/** Scales a color's brightness by k (per-cell variation). */
export function shade(rgb: Rgb, k: number): Rgb {
  return [rgb[0] * k, rgb[1] * k, rgb[2] * k];
}

/** Smooth 0→1 ramp between edge0 and edge1. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1e-6)));
  return t * t * (3 - 2 * t);
}
