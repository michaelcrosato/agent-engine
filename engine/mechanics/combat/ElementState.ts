import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

export const ElementState = defineComponent({
  name: 'ElementState',
  doc: 'Timed elemental state shared by weapons, enemies, abilities and environmental fields.',
  schema: {
    burn: field.number(0, { min: 0, doc: 'State: burning seconds remaining' }),
    chill: field.number(0, { min: 0, doc: 'State: chilled seconds remaining' }),
    wet: field.number(0, { min: 0, doc: 'State: conductive seconds remaining' }),
    charged: field.number(0, { min: 0, doc: 'State: empowered seconds remaining' }),
    source: field.int(-1, { doc: 'State: burn owner' }),
    power: field.number(0, { min: 0, doc: 'State: burn damage per second, already scaled' }),
    pulse: field.number(0, { doc: 'State: burn tick accumulator' }),
  },
});
