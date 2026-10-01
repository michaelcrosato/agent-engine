import { z } from 'zod';
import { defineContentKind } from '../../content/defineContentKind.ts';
import { textureOps } from './textureOps.ts';

const o = textureOps;

export const TextureLayerSchema = z.discriminatedUnion('op', [
  o.fill.schema,
  o.noise.schema,
  o.cells.schema,
  o.bricks.schema,
  o.tiles.schema,
  o.planks.schema,
  o.stripes.schema,
  o.checker.schema,
  o.lines.schema,
  o.rivets.schema,
  o.scratches.schema,
  o.spots.schema,
  o.gradient.schema,
]);

const pow2 = z
  .number()
  .int()
  .refine((n) => n >= 16 && n <= 1024 && (n & (n - 1)) === 0, {
    error: 'size must be a power of two from 16 to 1024',
  });

export const TextureRecipeSchema = z
  .object({
    doc: z.string().default(''),
    size: pow2
      .default(256)
      .meta({ description: 'Pixels per side (power of two). 32-64 for pixel-art looks' }),
    seed: z.number().int().default(1),
    roughness: z.number().min(0).max(1).default(0.8).meta({ description: 'Base roughness before layers' }),
    normal: z
      .number()
      .min(0)
      .max(16)
      .default(2)
      .meta({ description: 'Normal-map strength from height (0 = none)' }),
    layers: z
      .array(TextureLayerSchema)
      .min(1)
      .meta({ description: 'Ops applied in order: { "op": "bricks", ... }' }),
  })
  .strict();

export type TextureRecipe = z.output<typeof TextureRecipeSchema>;

/** Procedural textures: data/textures/<id>.json, generated at load (tileable). */
export const TextureKind = defineContentKind({
  name: 'texture',
  folder: 'textures',
  doc: 'Procedural texture recipe: ordered ops (bricks, noise, planks, ...) → albedo, normal, roughness.',
  schema: TextureRecipeSchema,
});
