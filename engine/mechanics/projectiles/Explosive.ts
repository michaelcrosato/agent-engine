import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/** Explodes when its Health runs out (barrels, mines). Chains with other explosives. */
export const Explosive = defineComponent({
  name: 'Explosive',
  doc: 'Explodes on death: splash damage, knockback, effect.',
  schema: {
    radius: field.number(4, { min: 0.1, unit: 'm' }),
    damage: field.number(80, { min: 0 }),
    impulse: field.number(10, { min: 0 }),
    effect: field.ref('effect', 'explosion'),
  },
});
