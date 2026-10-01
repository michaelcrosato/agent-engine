import { z } from 'zod';
import { defineContentKind } from '../content/defineContentKind.ts';

/** Component name → component fields in JSON form (validated against the component schema on spawn). */
export const ComponentsJson = z.record(
  z.string().regex(/^[A-Z][A-Za-z0-9]*$/, { error: 'Component names are PascalCase, e.g. "Health"' }),
  z.record(z.string(), z.unknown()),
);

export const PrefabSchema = z
  .object({
    doc: z.string().default('').meta({ description: 'What this prefab is, one line' }),
    extends: z
      .string()
      .default('')
      .meta({ description: 'Parent prefab id; components merge field by field', ref: 'prefab' }),
    tags: z.array(z.string()).default([]).meta({ description: 'Tags added to every instance' }),
    components: ComponentsJson.default({}).meta({ description: 'Component name → fields' }),
  })
  .strict();

export type Prefab = z.output<typeof PrefabSchema>;

/** Entity templates: data/prefabs/<id>.json. */
export const PrefabKind = defineContentKind({
  name: 'prefab',
  folder: 'prefabs',
  doc: 'Entity template: components (by name) with field values, tags, and an optional parent.',
  schema: PrefabSchema,
});
