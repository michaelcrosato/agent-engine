import { z } from 'zod';

/** Saved independently of room looks; other games keep their authored rendering by default. */
export const VisualFilterSchema = z.object({
  style: z.enum(['none', 'cel', 'graphic', 'vivid']).default('none'),
  scope: z.enum(['scene', 'environment', 'subjects']).default('scene'),
});

export type VisualFilter = z.output<typeof VisualFilterSchema>;
export type FilterGroup = 'environment' | 'subject';

export function filterIncludes(filter: VisualFilter, group: FilterGroup): boolean {
  return filter.scope === 'scene' || (filter.scope === 'environment') === (group === 'environment');
}

export function usesCelLighting(filter: VisualFilter, group: FilterGroup): boolean {
  return (filter.style === 'cel' || filter.style === 'graphic') && filterIncludes(filter, group);
}
