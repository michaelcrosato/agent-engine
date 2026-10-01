import { definePlugin } from '../../core/definePlugin.ts';
import { Spawner } from './Spawner.ts';
import { Spawned, SpawnerSystem } from './SpawnerSystem.ts';

/** Spawners for waves and drops. */
export const SpawnersPlugin = definePlugin({
  name: 'spawners',
  doc: 'Spawner component: spawn prefabs on signal or interval.',
  components: [Spawner],
  systems: [SpawnerSystem],
  events: [Spawned],
  requires: ['logic'],
});
