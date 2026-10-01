import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';

/** Where the player appears when a room loads. Rooms can have several, chosen by id. */
export const SpawnPoint = defineComponent({
  name: 'SpawnPoint',
  doc: 'Player spawn location; loadRoom picks one by id (default "default").',
  schema: {
    id: field.string('default', {
      doc: 'Spawn id used by room exits: { "room": "hub", "spawn": "from-arena" }',
    }),
  },
});
