import { definePlugin } from '../../core/definePlugin.ts';
import { AreaPulse } from './AreaPulse.ts';
import { AreaPulseSystem } from './AreaPulseSystem.ts';
import { CombatStats } from './CombatStats.ts';
import { ElementState } from './ElementState.ts';
import { ElementSystem } from './ElementSystem.ts';

export const CombatPlugin = definePlugin({
  name: 'combat',
  doc: 'Optional composable combat statistics and systemic fire / frost / shock reactions.',
  requires: ['health', 'effects'],
  components: [CombatStats, ElementState, AreaPulse],
  systems: [ElementSystem, AreaPulseSystem],
});
