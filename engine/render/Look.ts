import { z } from 'zod';
import { defineContentKind } from '../content/defineContentKind.ts';

const color = (def: string) =>
  z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { error: 'Expected a hex color like "#8a8f99"' })
    .default(def)
    .meta({ widget: 'color' });

export const MaterialSchema = z
  .object({
    type: z.enum(['standard', 'unlit', 'glow', 'glass', 'toon']).default('standard'),
    color: color('#ffffff'),
    texture: z
      .string()
      .default('')
      .meta({ description: 'Texture recipe id (data/textures)', ref: 'texture' }),
    tile: z
      .number()
      .positive()
      .default(2)
      .meta({ description: 'Meters covered by one texture tile (world UVs)' }),
    roughness: z.number().min(0).max(1).default(0.8),
    metalness: z.number().min(0).max(1).default(0),
    emissive: color('#000000'),
    emissiveIntensity: z.number().min(0).default(1),
    opacity: z.number().min(0).max(1).default(1),
    flat: z.boolean().default(false).meta({ description: 'Faceted (flat) shading' }),
    pixelated: z
      .boolean()
      .default(false)
      .meta({ description: 'Nearest-neighbor texture filtering (pixel art)' }),
    doubleSided: z.boolean().default(false),
  })
  .strict();

export type MaterialData = z.output<typeof MaterialSchema>;

export const LookSchema = z
  .object({
    doc: z.string().default(''),
    extends: z
      .string()
      .default('')
      .meta({ description: 'Parent look id; fields and materials merge', ref: 'look' }),
    sky: z
      .object({
        top: color('#5f86b8'),
        horizon: color('#b9c9d8'),
        bottom: color('#3b3f45'),
        stars: z.number().min(0).max(1).default(0),
      })
      .strict()
      .prefault({}),
    fog: z
      .object({
        color: color('#9fb0c0'),
        near: z.number().min(0).default(20),
        far: z.number().min(0).default(120),
      })
      .strict()
      .prefault({}),
    ambient: z
      .object({ sky: color('#c8d8ff'), ground: color('#3a3530'), intensity: z.number().min(0).default(1) })
      .strict()
      .prefault({}),
    sun: z
      .object({
        color: color('#fff2dd'),
        intensity: z.number().min(0).default(2.5),
        dir: z.tuple([z.number(), z.number(), z.number()]).default([-0.4, -1, -0.3]),
        shadows: z.boolean().default(true),
      })
      .strict()
      .prefault({}),
    exposure: z.number().positive().default(1),
    toneMapping: z.enum(['aces', 'agx', 'neutral', 'none']).default('agx'),
    renderScale: z
      .number()
      .min(0.1)
      .max(2)
      .default(1)
      .meta({ description: '<1 renders at lower resolution (retro)' }),
    post: z
      .string()
      .default('')
      .meta({ description: 'Post-processing stack id (data/post), "" for none', ref: 'post' }),
    materials: z
      .record(z.string(), MaterialSchema)
      .default({})
      .meta({ description: 'Material name → material. Parts refer to names: wall, floor, metal, glow, ...' }),
  })
  .strict();

export type LookData = z.output<typeof LookSchema>;

/** Visual styles: data/looks/<id>.json. Sky, fog, lights, tone mapping, post stack, and named materials. */
export const LookKind = defineContentKind({
  name: 'look',
  folder: 'looks',
  doc: 'Scene style: sky, fog, lighting, exposure, post-processing, and the named material palette.',
  schema: LookSchema,
});
