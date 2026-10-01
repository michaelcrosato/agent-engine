import { z } from 'zod';
import { defineContentKind } from '../content/defineContentKind.ts';
import { ComponentsJson } from './Prefab.ts';

export const TuningSchema = z
  .object({
    doc: z.string().default(''),
    prefabs: z
      .record(z.string(), ComponentsJson)
      .default({})
      .meta({ description: 'Prefab id → component overrides (also applies to prefabs that extend it)' }),
    tags: z.record(z.string(), ComponentsJson).default({}).meta({ description: 'Tag → component overrides' }),
  })
  .strict();

export type Tuning = z.output<typeof TuningSchema>;

/**
 * Tuning presets: named sets of component overrides, e.g. "snappy-movement" or "hard-enemies".
 * Active presets (game + room + `?tuning=`) are merged into prefabs at spawn time.
 */
export const TuningKind = defineContentKind({
  name: 'tuning',
  folder: 'tuning',
  doc: 'Preset of component overrides by prefab or tag; switch game feel without editing prefabs.',
  schema: TuningSchema,
});
