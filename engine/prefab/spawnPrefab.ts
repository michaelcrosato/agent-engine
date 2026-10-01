import type { Quaternion } from 'three';
import type { Vec3Like } from '../audio/AudioOut.ts';
import type { Engine } from '../core/Engine.ts';
import { EngineError, type ErrorWhere } from '../core/EngineError.ts';
import { Transform } from '../core/Transform.ts';
import type { Entity } from '../core/World.ts';
import { toQuat } from '../schema/field.ts';
import { deepMerge } from './deepMerge.ts';
import { resolvePrefab } from './resolvePrefab.ts';
import { TuningKind } from './Tuning.ts';

type Json = Record<string, Record<string, unknown>>;

export type SpawnOptions = {
  /** Unique entity name (for signals, tests, and the editor). */
  name?: string;
  pos?: Vec3Like | readonly [number, number, number];
  /** Yaw degrees, [x, y, z] Euler degrees (YXZ), or a quaternion. */
  rot?: number | readonly [number, number, number] | Quaternion;
  scale?: number | readonly [number, number, number];
  /** Component overrides in JSON form, merged over the prefab: `{ Health: { max: 200 } }`. */
  with?: Json;
  tags?: readonly string[];
  /** Where the spawn request came from, for error messages (room file + JSON path). */
  where?: ErrorWhere;
  /** Room-file origin recorded on the entity for the editor: `entities[3]`, `grid[col,row]`. */
  source?: string;
};

function tuningFor(engine: Engine, lineage: readonly string[], tags: readonly string[]): Json {
  const layers: Json[] = [];
  for (const id of engine.activeTuning) {
    if (!engine.content.has(TuningKind, id)) continue;
    const preset = engine.content.get(TuningKind, id);
    for (const p of [...lineage].reverse()) if (preset.prefabs[p]) layers.push(preset.prefabs[p]);
    for (const t of tags) if (preset.tags[t]) layers.push(preset.tags[t]);
  }
  return deepMerge(...layers) as Json;
}

/**
 * Creates an entity from a prefab: resolves `extends`, applies active tuning presets, then
 * `opts.with` overrides, validates every component, and sets the Transform from pos/rot/scale.
 */
export function spawnPrefab(engine: Engine, prefab: string, opts: SpawnOptions = {}): Entity {
  const resolved = resolvePrefab(engine.content, prefab, opts.where);
  const tags = [...resolved.tags, ...(opts.tags ?? [])];
  const tuning = tuningFor(engine, resolved.lineage, tags);
  const comps = deepMerge(resolved.components, tuning, opts.with) as Json;
  const world = engine.world;
  const e = world.spawn({
    tags,
    prefab,
    ...(opts.name ? { name: opts.name } : {}),
    ...(opts.source ? { source: opts.source } : {}),
  });
  try {
    for (const [name, json] of Object.entries(comps)) {
      const fromOverride = !!opts.with?.[name];
      const where: ErrorWhere = fromOverride
        ? { ...opts.where, path: `${opts.where?.path ?? '$'}.with.${name}` }
        : { file: engine.content.entry('prefab', prefab)?.file, path: `$.components.${name}` };
      const type = engine.component(name, where);
      world.attach(e, type, type.create(json, { ...where, entity: world.label(e) }));
    }
    const t = world.get(e, Transform) ?? world.add(e, Transform);
    if (opts.pos) {
      const p = opts.pos as Vec3Like & readonly number[];
      if (Array.isArray(opts.pos)) t.pos.set(p[0]!, p[1]!, p[2]!);
      else t.pos.set(p.x, p.y, p.z);
    }
    if (opts.rot !== undefined) {
      t.rot.copy(
        typeof opts.rot === 'number' || Array.isArray(opts.rot)
          ? toQuat(opts.rot as never)
          : (opts.rot as Quaternion),
      );
    }
    if (opts.scale !== undefined) {
      if (typeof opts.scale === 'number') t.scale.setScalar(opts.scale);
      else t.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
    }
  } catch (err) {
    world.destroy(e);
    if (err instanceof EngineError) throw err.at(opts.where ?? {});
    throw err;
  }
  return e;
}
