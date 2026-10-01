import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';

/** Sends the player to another room when they enter this entity's sensor. */
export const RoomExit = defineComponent({
  name: 'RoomExit',
  doc: 'Sensor that loads another room (and spawn point) when the player enters.',
  schema: {
    room: field.ref('room', '', { doc: 'Room id to load' }),
    spawn: field.string('default', { doc: 'SpawnPoint id in that room' }),
    locked: field.bool(false, { doc: '"unlock"/"lock" signals change this' }),
  },
});
