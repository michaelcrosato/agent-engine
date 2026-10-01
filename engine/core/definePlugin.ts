import type { ContentKind } from '../content/defineContentKind.ts';
import type { Room } from '../level/Room.ts';
import type { ComponentType } from './defineComponent.ts';
import type { EventType } from './defineEvent.ts';
import type { SystemDef } from './defineSystem.ts';
import type { Engine } from './Engine.ts';

/**
 * A plugin bundles one feature: components, systems, events, content kinds, and hooks.
 * Mechanics (doors, weapons, health...) are plugins. Games are lists of plugins.
 */
export type PluginDef = {
  readonly kind: 'plugin';
  readonly name: string;
  readonly doc: string;
  readonly components: readonly ComponentType[];
  readonly systems: readonly SystemDef[];
  readonly events: readonly EventType[];
  readonly contentKinds: readonly ContentKind[];
  /** Plugin names that must appear earlier in the game's plugin list. */
  readonly requires: readonly string[];
  /** Data pack this plugin brings ("mechanics" or "kit:<name>"); its data/ is loaded for the game. */
  readonly data: string;
  /** Runs once when the engine is created (create services, subscribe to events). */
  readonly setup?: (engine: Engine) => void | Promise<void>;
  /** Runs after the world is cleared and before a room's entities spawn. */
  readonly roomLoad?: (engine: Engine, room: Room) => void;
  /** Runs after all of a room's entities have spawned. */
  readonly roomReady?: (engine: Engine, room: Room) => void;
  /** Runs before a room unloads. */
  readonly roomUnload?: (engine: Engine) => void;
};

export function definePlugin(def: {
  name: string;
  doc: string;
  components?: readonly ComponentType[];
  systems?: readonly SystemDef[];
  events?: readonly EventType[];
  contentKinds?: readonly ContentKind[];
  requires?: readonly string[];
  data?: string;
  setup?: (engine: Engine) => void | Promise<void>;
  roomLoad?: (engine: Engine, room: Room) => void;
  roomReady?: (engine: Engine, room: Room) => void;
  roomUnload?: (engine: Engine) => void;
}): PluginDef {
  return {
    kind: 'plugin',
    components: [],
    systems: [],
    events: [],
    contentKinds: [],
    requires: [],
    data: '',
    ...def,
  };
}
