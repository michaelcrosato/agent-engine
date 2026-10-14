import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

export const AreaPulse = defineComponent({
  name: 'AreaPulse',
  doc: 'Delayed, telegraphed area damage for spells, bosses and environmental reactions.',
  schema: {
    radius: field.number(4, { min: 0.1 }),
    delay: field.number(0.8, { min: 0 }),
    damage: field.number(40, { min: 0 }),
    owner: field.int(-1),
    targetTag: field.string('enemy'),
    element: field.enum(['kinetic', 'fire', 'frost', 'shock'], 'kinetic'),
    effect: field.ref('effect', 'explosion'),
    age: field.number(0, { doc: 'State' }),
  },
});
