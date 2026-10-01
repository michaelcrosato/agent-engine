import type { AudioOut } from '../audio/AudioOut.ts';
import type { ContentStore } from '../content/ContentStore.ts';
import type { InputState } from '../input/InputState.ts';
import type { Physics } from '../physics/Physics.ts';
import type { SpawnOptions } from '../prefab/spawnPrefab.ts';
import type { ServiceKey } from './defineService.ts';
import type { Engine } from './Engine.ts';
import type { EventView } from './EventBus.ts';
import type { Log } from './Log.ts';
import type { Rng } from './Rng.ts';
import type { Time } from './Time.ts';
import type { Entity, World } from './World.ts';

/**
 * Everything a system may touch, passed explicitly (no globals). Each system gets its own
 * Ctx so `events.read` delivers each event to each system exactly once.
 */
export type Ctx = {
  readonly world: World;
  readonly time: Time;
  readonly events: EventView;
  readonly rng: Rng;
  readonly content: ContentStore;
  readonly input: InputState;
  readonly physics: Physics;
  readonly audio: AudioOut;
  readonly log: Log;
  /** 'headless' in tests and tools; 'browser' when rendering. */
  readonly mode: 'headless' | 'browser';
  /** Name of the running system (for error messages). */
  readonly system: string;
  /** Spawns a prefab instance (validated, tuning applied). */
  spawn(prefab: string, opts?: SpawnOptions): Entity;
  /** A plugin-provided service; throws a teaching error if no plugin provides it. */
  service<T>(key: ServiceKey<T>): T;
  /** Escape hatch for rare needs (room changes, registry lookups). */
  readonly engine: Engine;
};
