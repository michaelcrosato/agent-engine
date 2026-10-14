import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/** Optional combat modifiers. Games without this component keep the original damage rules. */
export const CombatStats = defineComponent({
  name: 'CombatStats',
  doc: 'Composable damage, movement, elemental and on-hit modifiers for any combatant.',
  schema: {
    damage: field.number(1, { min: 0 }),
    incoming: field.number(1, { min: 0 }),
    movement: field.number(1, { min: 0 }),
    critical: field.number(0, { min: 0, max: 1 }),
    criticalDamage: field.number(1.8, { min: 1 }),
    element: field.enum(['kinetic', 'fire', 'frost', 'shock'], 'kinetic'),
    leech: field.number(0, { min: 0, max: 1 }),
    chains: field.int(0, { min: 0, max: 8 }),
    detonate: field.number(0, { min: 0, doc: 'On-kill explosion as a fraction of target maximum health' }),
  },
});
