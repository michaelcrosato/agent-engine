import { z } from 'zod';
import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/** The player's weapons (prefab ids with a Weapon component), magazines, and fire state. */
export const Arsenal = defineComponent({
  name: 'Arsenal',
  doc: 'Owned weapons, current selection, magazine counts, cooldown and reload state.',
  schema: {
    weapons: field.list(z.string(), [], { doc: 'Weapon prefab ids owned' }),
    current: field.int(-1, { doc: 'Index into weapons (-1 = none)' }),
    mags: z
      .record(z.string(), z.number())
      .default({})
      .meta({ description: 'State: rounds loaded per weapon' }),
    cooldown: field.number(0, { doc: 'State: seconds until the next shot' }),
    reloading: field.number(0, { doc: 'State: seconds of reload left' }),
    switching: field.number(0, { doc: 'State: seconds of weapon raise left' }),
    shots: field.int(0, { doc: 'State: total shots fired' }),
  },
});
