import { ActionPlugin, CombatPlugin, defineGame, fpsKit } from '#engine/api.ts';
import { RiftPlugin } from './RiftPlugin.ts';

export const game = defineGame({
  name: 'rift-runner',
  doc: 'Rift Runner: fluid elemental loot combat, a living salvage hub, deep builds and endless expeditions.',
  plugins: [...fpsKit({ hud: false }), CombatPlugin, ActionPlugin, RiftPlugin],
  startRoom: 'start',
  playerPrefab: 'runner',
  input: 'rift',
});
