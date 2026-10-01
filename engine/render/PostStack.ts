import { z } from 'zod';
import { defineContentKind } from '../content/defineContentKind.ts';

const color = (def: string) =>
  z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .default(def);

export const PassSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('bloom'),
      strength: z.number().min(0).max(5).default(0.6),
      radius: z.number().min(0).max(1).default(0.4),
      threshold: z.number().min(0).max(2).default(0.85),
    })
    .strict(),
  z
    .object({
      type: z.literal('vignette'),
      amount: z.number().min(0).max(2).default(0.5),
      softness: z.number().min(0.01).max(1).default(0.5),
    })
    .strict(),
  z
    .object({
      type: z.literal('grade'),
      saturation: z.number().min(0).max(3).default(1),
      contrast: z.number().min(0).max(3).default(1),
      brightness: z.number().min(-1).max(1).default(0),
      tint: color('#ffffff'),
    })
    .strict(),
  z.object({ type: z.literal('grain'), amount: z.number().min(0).max(1).default(0.05) }).strict(),
  z.object({ type: z.literal('chromatic'), amount: z.number().min(0).max(0.05).default(0.002) }).strict(),
  z.object({ type: z.literal('pixelate'), size: z.number().int().min(1).max(32).default(3) }).strict(),
  z
    .object({
      type: z.literal('scanlines'),
      amount: z.number().min(0).max(1).default(0.15),
      count: z.number().min(50).max(2000).default(480),
    })
    .strict(),
  z.object({ type: z.literal('posterize'), levels: z.number().int().min(2).max(64).default(8) }).strict(),
  z.object({ type: z.literal('fxaa') }).strict(),
]);

export type PassData = z.output<typeof PassSchema>;

export const PostStackSchema = z
  .object({
    doc: z.string().default(''),
    passes: z.array(PassSchema).default([]).meta({ description: 'Applied in order after the scene renders' }),
  })
  .strict();

export type PostStackData = z.output<typeof PostStackSchema>;

/** Post-processing stacks: data/post/<id>.json, referenced by looks. */
export const PostStackKind = defineContentKind({
  name: 'post',
  folder: 'post',
  doc: 'Post-processing stack: ordered passes (bloom, vignette, grade, grain, pixelate, ...).',
  schema: PostStackSchema,
});
