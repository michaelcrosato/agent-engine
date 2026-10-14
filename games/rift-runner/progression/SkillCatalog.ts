import { defineContentKind, z } from '#engine/api.ts';
import { statNames } from './Profile.ts';

export const SkillCatalog = defineContentKind({
  name: 'skill',
  folder: 'skills',
  doc: 'Passive skill nodes with prerequisite links and named combat-stat contributions.',
  schema: z
    .object({
      name: z.string(),
      branch: z.enum(['Vanguard', 'Tempest', 'Catalyst']),
      description: z.string(),
      requires: z.string().default('').meta({ ref: 'skill' }),
      tier: z.number().int().min(0).max(10),
      maxRank: z.number().int().min(1).max(5).default(3),
      bonuses: z.array(z.object({ stat: z.enum(statNames), value: z.number().nonnegative() })),
    })
    .strict(),
});
