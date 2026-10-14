import { defineContentKind, z } from '#engine/api.ts';
import { statNames } from './Profile.ts';

// The same compatibility vocabulary is available to data authors and runtime grammar users.
const token = {
  id: z.string().min(1),
  weight: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
  requires: z.array(z.string()).optional(),
  excludes: z.array(z.string()).optional(),
};

export const ExpeditionCatalog = defineContentKind({
  name: 'expedition',
  folder: 'expeditions',
  doc: 'The expedition vocabulary: lessons, biomes, chassis, behaviors and loot affixes.',
  schema: z
    .object({
      lessons: z.array(z.object({ id: z.string(), name: z.string(), hint: z.string() })).min(1),
      layouts: z
        .array(
          z.object({
            ...token,
            terraces: z
              .array(z.tuple([z.number().min(-19).max(19), z.number().min(-19).max(19)]))
              .min(1)
              .max(8),
          }),
        )
        .min(1),
      bosses: z
        .array(
          z.object({
            ...token,
            name: z.string(),
            prefab: z.string().meta({ ref: 'prefab' }),
            health: z.number().positive(),
            patterns: z
              .array(z.enum(['shot', 'strike', 'nova']))
              .min(1)
              .max(8),
          }),
        )
        .min(1),
      biomes: z
        .array(
          z.object({
            ...token,
            name: z.string(),
            look: z.string().meta({ ref: 'look' }),
            color: z.string(),
            material: z.string(),
          }),
        )
        .min(1),
      chassis: z
        .array(
          z.object({
            ...token,
            name: z.string(),
            prefab: z.string().meta({ ref: 'prefab' }),
            health: z.number().positive(),
            speed: z.number().positive(),
            behavior: z.enum(['stalker', 'gunner', 'charger', 'orbiter']),
          }),
        )
        .min(1),
      affixes: z
        .array(
          z
            .object({
              id: z.string(),
              name: z.string(),
              stat: z.enum(statNames),
              min: z.number().nonnegative(),
              max: z.number().nonnegative(),
            })
            .refine((a) => a.max >= a.min, { message: 'Affix maximum must be at least its minimum' }),
        )
        .min(1),
    })
    .strict(),
});
export type ExpeditionData = z.infer<typeof ExpeditionCatalog.schema>;
