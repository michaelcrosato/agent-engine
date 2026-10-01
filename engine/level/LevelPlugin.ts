import { definePlugin } from '../core/definePlugin.ts';
import { RoomLoaded } from './levelEvents.ts';
import { SpawnPoint } from './SpawnPoint.ts';

/** Rooms, grid maps, and spawn points. */
export const LevelPlugin = definePlugin({
  name: 'level',
  doc: 'Room loading support: SpawnPoint component and the RoomLoaded event.',
  components: [SpawnPoint],
  events: [RoomLoaded],
});
