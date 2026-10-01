import { definePlugin } from '../../core/definePlugin.ts';
import { Hazard } from './Hazard.ts';
import { HazardSystem } from './HazardSystem.ts';

/** Damage-over-time volumes (lava, acid). */
export const HazardsPlugin = definePlugin({
  name: 'hazards',
  doc: 'Hazard volumes that damage whatever stands in them.',
  components: [Hazard],
  systems: [HazardSystem],
  requires: ['health'],
});
