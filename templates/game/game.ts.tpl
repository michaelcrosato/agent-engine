import { defineGame, fpsKit } from '#engine/api.ts';

/**
 * __doc__
 * Plugins: fpsKit() gives a playable first-person game. For other genres start from
 * standardPlugins() (+ mechanicPlugins()) and add your own plugins.
 */
export const game = defineGame({
  name: '__name__',
  doc: '__doc__',
  plugins: fpsKit(),
  startRoom: 'start',
  playerPrefab: 'player',
});
