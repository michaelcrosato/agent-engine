import { z } from 'zod';
import { defineContentKind } from '../content/defineContentKind.ts';
import { PartSchema } from './Part.ts';

export const PuppetSchema = z
  .object({
    doc: z.string().default(''),
    parts: z.array(PartSchema).min(1).meta({ description: 'Primitive parts; parents must come first' }),
    clips: z
      .record(z.string(), z.string().meta({ ref: 'clip' }))
      .default({})
      .meta({ description: 'Animation role → clip id, e.g. { "idle": "grunt-idle", "walk": "grunt-walk" }' }),
  })
  .strict();

export type Puppet = z.output<typeof PuppetSchema>;

/** Procedural models: data/puppets/<id>.json, built from primitive parts at load time. */
export const PuppetKind = defineContentKind({
  name: 'puppet',
  folder: 'puppets',
  doc: 'Procedural model: a tree of primitive parts with materials; animated by clips.',
  schema: PuppetSchema,
});
