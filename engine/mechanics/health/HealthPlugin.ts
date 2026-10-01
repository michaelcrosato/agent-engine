import { definePlugin } from '../../core/definePlugin.ts';
import { Health } from './Health.ts';
import { HealthSystem } from './HealthSystem.ts';
import { Damaged, Died, Healed } from './healthEvents.ts';
import { OutOfBoundsSystem } from './OutOfBoundsSystem.ts';
import { Respawn } from './Respawn.ts';
import { RespawnSystem } from './RespawnSystem.ts';

/** Health, damage, healing, and death handling. Use applyDamage()/heal() from any system. */
export const HealthPlugin = definePlugin({
  name: 'health',
  doc: 'Health and Respawn components, applyDamage/heal helpers, Damaged/Died/Healed events.',
  components: [Health, Respawn],
  systems: [HealthSystem, RespawnSystem, OutOfBoundsSystem],
  events: [Damaged, Died, Healed],
  requires: ['logic'],
  data: 'mechanics',
});
