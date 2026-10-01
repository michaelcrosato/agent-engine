import { TexCanvas } from './TexCanvas.ts';
import type { TextureRecipe } from './TextureRecipe.ts';
import { textureOp } from './textureOps.ts';

/** RGBA8 pixel buffers, row 0 = v 0 (the bottom edge in 3D; the top row in PNG previews). */
export type TextureMaps = {
  size: number;
  albedo: Uint8ClampedArray;
  normal: Uint8ClampedArray | undefined;
  roughness: Uint8ClampedArray;
  emissive: Uint8ClampedArray | undefined;
};

function normalFromHeight(c: TexCanvas, strength: number): Uint8ClampedArray {
  const s = c.size;
  const out = new Uint8ClampedArray(s * s * 4);
  const h = c.height;
  const at = (x: number, y: number) => h[(((y % s) + s) % s) * s + (((x % s) + s) % s)]!;
  const k = (strength * s) / 256;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * k;
      const dy = (at(x, y + 1) - at(x, y - 1)) * k;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * s + x) * 4;
      out[i] = (-dx / len) * 127.5 + 127.5;
      out[i + 1] = (-dy / len) * 127.5 + 127.5;
      out[i + 2] = (1 / len) * 127.5 + 127.5;
      out[i + 3] = 255;
    }
  }
  return out;
}

/** Runs a recipe's ops and packs the result into RGBA8 maps. Pure; works in Node and browsers. */
export function renderTexture(recipe: TextureRecipe): TextureMaps {
  const c = new TexCanvas(recipe.size, recipe.roughness);
  recipe.layers.forEach((layer, idx) => {
    textureOp(layer.op)!.apply(c, layer as never, recipe.seed * 7919 + idx * 104729);
  });
  const n = recipe.size * recipe.size;
  const albedo = new Uint8ClampedArray(n * 4);
  const roughness = new Uint8ClampedArray(n * 4);
  let glowing = false;
  for (let i = 0; i < n; i++) if (c.glow[i]! > 0) glowing = true;
  const emissive = glowing ? new Uint8ClampedArray(n * 4) : undefined;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    albedo[o] = c.r[i]! * 255;
    albedo[o + 1] = c.g[i]! * 255;
    albedo[o + 2] = c.b[i]! * 255;
    albedo[o + 3] = 255;
    const r = Math.min(1, Math.max(0.02, c.rough[i]!)) * 255;
    roughness[o] = r;
    roughness[o + 1] = r;
    roughness[o + 2] = r;
    roughness[o + 3] = 255;
    if (emissive) {
      const gl = c.glow[i]!;
      emissive[o] = albedo[o]! * gl;
      emissive[o + 1] = albedo[o + 1]! * gl;
      emissive[o + 2] = albedo[o + 2]! * gl;
      emissive[o + 3] = 255;
    }
  }
  return {
    size: recipe.size,
    albedo,
    normal: recipe.normal > 0 ? normalFromHeight(c, recipe.normal) : undefined,
    roughness,
    emissive,
  };
}
