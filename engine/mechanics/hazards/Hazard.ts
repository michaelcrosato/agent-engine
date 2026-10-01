import { z } from 'zod';
import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/** Damages entities inside its sensor every tick (lava, acid, electric floors). */
export const Hazard = defineComponent({
  name: 'Hazard',
  doc: 'Damage over time to entities overlapping its sensor Body.',
  schema: {
    dps: field.number(25, { min: 0, unit: 'hp/s' }),
    filter: field.string('any', { doc: '"any" or a tag the victim must have' }),
    sound: field.ref('sound', '', { doc: 'Played when something enters' }),
    inside: field.list(z.number(), [], { doc: 'State: entities currently inside' }),
  },
});
