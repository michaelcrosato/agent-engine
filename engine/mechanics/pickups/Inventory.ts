import { z } from 'zod';
import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/** What an entity carries: keys, ammo by type, and countable items. */
export const Inventory = defineComponent({
  name: 'Inventory',
  doc: 'Keys, ammo (by type), and items carried by the player (or any picker).',
  schema: {
    keys: field.list(z.string(), [], { doc: 'Key names, e.g. "red"' }),
    ammo: z.record(z.string(), z.number()).default({}).meta({ description: 'Ammo type → rounds in reserve' }),
    items: z.record(z.string(), z.number()).default({}).meta({ description: 'Item id → count' }),
  },
});
