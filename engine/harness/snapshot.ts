import type { ComponentType } from '../core/defineComponent.ts';
import type { Engine } from '../core/Engine.ts';
import { Transform } from '../core/Transform.ts';
import type { Entity } from '../core/World.ts';
import { toJsonValue } from '../schema/toJsonValue.ts';

export type EntitySnapshot = {
  id: Entity;
  name?: string;
  prefab?: string;
  tags?: string[];
  pos?: unknown;
  components: Record<string, unknown>;
};

export type Snapshot = {
  game: string;
  room: string;
  tick: number;
  seconds: number;
  entities: EntitySnapshot[];
};

export type SnapshotOpts = {
  /** Include level geometry blocks (tag "level"). Default false. */
  level?: boolean;
  /** Only these component names (default: all except Transform, which becomes `pos`). */
  components?: readonly string[];
  /** Only entities matching (name, prefab, or tag). */
  filter?: (e: Entity) => boolean;
};

/** Compact JSON view of the world for captures, tool output, and debugging. */
export function snapshot(engine: Engine, opts: SnapshotOpts = {}): Snapshot {
  const w = engine.world;
  const entities: EntitySnapshot[] = [];
  for (const e of w.entities()) {
    if (!opts.level && w.hasTag(e, 'level')) continue;
    if (opts.filter && !opts.filter(e)) continue;
    const comps: Record<string, unknown> = {};
    for (const c of w.componentsOf(e) as ComponentType[]) {
      if (c === Transform) continue;
      if (opts.components && !opts.components.includes(c.name)) continue;
      comps[c.name] = toJsonValue(w.get(e, c), 2);
    }
    const snap: EntitySnapshot = { id: e, components: comps };
    const name = w.nameOf(e);
    const prefab = w.prefabOf(e);
    const tags = w.tagsOf(e);
    const t = w.get(e, Transform);
    if (name) snap.name = name;
    if (prefab) snap.prefab = prefab;
    if (tags.length) snap.tags = tags;
    if (t) snap.pos = toJsonValue(t.pos, 2);
    entities.push(snap);
  }
  return {
    game: engine.game.name,
    room: engine.roomId,
    tick: engine.time.tick,
    seconds: Math.round(engine.time.elapsed * 100) / 100,
    entities,
  };
}
