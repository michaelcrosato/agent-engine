import { z } from 'zod';
import { defineContentKind } from '../content/defineContentKind.ts';
import { EASING_NAMES } from './easing.ts';

export const PROPS = [
  'pos.x',
  'pos.y',
  'pos.z',
  'rot.x',
  'rot.y',
  'rot.z',
  'scale',
  'scale.x',
  'scale.y',
  'scale.z',
] as const;

export const ClipTrackSchema = z
  .object({
    part: z.string().meta({ description: 'Puppet part id' }),
    prop: z
      .enum(PROPS)
      .meta({ description: 'pos.* in meters, rot.* in degrees (added to the rest pose); scale multiplies' }),
    keys: z
      .array(z.tuple([z.number(), z.number()]))
      .default([])
      .meta({ description: '[time, value] pairs, time in seconds' }),
    ease: z.enum(EASING_NAMES).default('sine'),
    wave: z
      .object({
        amp: z.number().default(10),
        freq: z.number().default(1).meta({ description: 'Cycles per second' }),
        phase: z.number().default(0).meta({ description: 'Cycle offset 0..1' }),
        offset: z.number().default(0),
      })
      .strict()
      .optional()
      .meta({ description: 'Procedural sine instead of keys: offset + amp * sin(2π(freq t + phase))' }),
  })
  .strict();

export const ClipSchema = z
  .object({
    doc: z.string().default(''),
    duration: z.number().positive().default(1),
    loop: z.boolean().default(true),
    tracks: z.array(ClipTrackSchema).min(1),
  })
  .strict();

export type ClipData = z.output<typeof ClipSchema>;
export type ClipTrack = z.output<typeof ClipTrackSchema>;

/** Animation clips: data/clips/<id>.json. Additive keyframe or sine tracks on puppet parts. */
export const ClipKind = defineContentKind({
  name: 'clip',
  folder: 'clips',
  doc: 'Animation clip: keyframe or procedural sine tracks that offset puppet parts.',
  schema: ClipSchema,
});
