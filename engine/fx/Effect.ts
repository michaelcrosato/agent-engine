import { z } from 'zod';
import { defineContentKind } from '../content/defineContentKind.ts';

const range = (a: number, b: number) => z.tuple([z.number(), z.number()]).default([a, b]);
const color = (def: string) =>
  z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .default(def);

export const EffectSchema = z
  .object({
    doc: z.string().default(''),
    type: z
      .enum(['burst', 'tracer'])
      .default('burst')
      .meta({ description: 'burst = particles; tracer = fading line' }),
    count: z.number().int().min(0).max(512).default(12),
    lifetime: range(0.2, 0.5).meta({ description: '[min, max] seconds' }),
    speed: range(2, 6).meta({ description: '[min, max] m/s' }),
    spread: z
      .number()
      .min(0)
      .max(180)
      .default(70)
      .meta({ description: 'Cone half-angle around the normal (180 = sphere)' }),
    size: range(0.04, 0.08).meta({ description: '[min, max] meters' }),
    sizeEnd: z.number().min(0).default(0.2).meta({ description: 'Size multiplier at end of life' }),
    color: color('#ffd27a'),
    colorEnd: color('#ff5a1f'),
    gravity: z.number().default(-9),
    drag: z.number().min(0).default(1),
    radius: z.number().min(0).default(0).meta({ description: 'Spawn volume radius' }),
    glow: z
      .boolean()
      .default(true)
      .meta({ description: 'Additive blending (fire, sparks); false for smoke/debris' }),
    light: z
      .object({
        color: color('#ffaa55'),
        intensity: z.number().min(0).default(40),
        range: z.number().min(0).default(6),
        seconds: z.number().min(0).default(0.08),
      })
      .strict()
      .optional()
      .meta({ description: 'Brief flash light' }),
    sound: z.string().default('').meta({ description: 'Sound played at the effect', ref: 'sound' }),
    width: z.number().min(0).default(0.02).meta({ description: 'tracer: line width hint' }),
  })
  .strict();

export type EffectData = z.output<typeof EffectSchema>;

/** Visual effects: data/effects/<id>.json (particle bursts, tracers, flash lights). */
export const EffectKind = defineContentKind({
  name: 'effect',
  folder: 'effects',
  doc: 'Particle burst or tracer with optional flash light and sound.',
  schema: EffectSchema,
});
