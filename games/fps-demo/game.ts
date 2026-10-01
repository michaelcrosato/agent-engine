import { defineGame, fpsKit } from '#engine/api.ts';

/**
 * Stage 2 demo: a hub connecting showcase rooms. Each room demonstrates one engine area and is
 * a headless test (data/rooms/<room>.test.ts). Copy the nearest room to start a new one.
 */
export const game = defineGame({
  name: 'fps-demo',
  doc: 'FPS showcase: movement, weapons, physics, enemies, doors/keys, audio, looks, animation.',
  plugins: fpsKit(),
  startRoom: 'hub',
  playerPrefab: 'player',
});
