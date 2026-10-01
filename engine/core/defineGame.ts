import type { PluginDef } from './definePlugin.ts';

/** A game: a folder under games/ with data files, plus the plugins that give them behavior. */
export type GameDef = {
  readonly kind: 'game';
  /** Folder name under games/. */
  readonly name: string;
  readonly doc: string;
  readonly plugins: readonly PluginDef[];
  /** Room loaded first. */
  readonly startRoom: string;
  /** Input map id (data/input/<id>.json). */
  readonly input: string;
  /** Prefab spawned at the room's player spawn, or '' for none. */
  readonly playerPrefab: string;
  /** Tuning presets applied to every room (data/tuning/<id>.json). */
  readonly tuning: readonly string[];
};

export function defineGame(def: {
  name: string;
  doc: string;
  plugins: readonly PluginDef[];
  startRoom: string;
  input?: string;
  playerPrefab?: string;
  tuning?: readonly string[];
}): GameDef {
  return { kind: 'game', input: 'default', playerPrefab: '', tuning: [], ...def };
}
