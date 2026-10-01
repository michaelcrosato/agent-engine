import type { ComponentType } from '../../engine/core/defineComponent.ts';
import type { Engine } from '../../engine/core/Engine.ts';
import { EngineError, toEngineError } from '../../engine/core/EngineError.ts';
import { didYouMean } from '../../engine/core/suggest.ts';
import { RoomKind } from '../../engine/level/Room.ts';
import { PrefabKind } from '../../engine/prefab/Prefab.ts';
import { resolvePrefab } from '../../engine/prefab/resolvePrefab.ts';
import { collectRefs, type Ref } from './collectRefs.ts';
import { openGame } from './openGame.ts';

export type ValidationReport = {
  game: string;
  files: number;
  rooms: number;
  prefabs: number;
  errors: EngineError[];
};

function refError(
  engine: Engine,
  ref: Ref,
  file: string | undefined,
  subject: string,
): EngineError | undefined {
  const c = engine.content;
  if (ref.kind === 'entity' || !c.kindList().some((k) => k.name === ref.kind) || c.has(ref.kind, ref.id))
    return undefined;
  return new EngineError({
    code: 'CONTENT_REF_MISSING',
    what: `${subject} refers to ${ref.kind} "${ref.id}", which does not exist`,
    where: { ...(file ? { file } : {}), path: ref.path },
    why: didYouMean(ref.id, c.ids(ref.kind)),
    fix: `Fix the id, or create it: npm run new -- ${ref.kind} ${ref.id}`,
  });
}

/**
 * Validates everything a game can load: every data file against its schema, every reference
 * between files, every prefab's components, and every room by actually building it headlessly
 * (grid glyphs, prefab overrides, spawn points, signal targets).
 */
export async function validateGame(name: string): Promise<ValidationReport> {
  const engine = await openGame(name);
  const c = engine.content;
  const errors: EngineError[] = [...c.errors()];
  const push = (e: EngineError | undefined) => e && errors.push(e);
  let files = 0;
  for (const kind of c.kindList()) {
    for (const id of c.ids(kind)) {
      const entry = c.entry(kind, id)!;
      files++;
      if (entry.errors.length) continue;
      for (const ref of collectRefs(kind.schema, entry.raw))
        push(refError(engine, ref, entry.file, `${kind.name} "${id}"`));
    }
  }
  const gamePack = c.gamePack;
  const registered = new Set(engine.componentTypes().map((t) => t.name));
  for (const id of c.ids(PrefabKind)) {
    const entry = c.entry(PrefabKind, id)!;
    if (entry.errors.length) continue;
    try {
      const comps = resolvePrefab(c, id).components;
      const names = Object.keys(comps);
      if (entry.pack !== gamePack && names.some((n) => !registered.has(n))) continue;
      for (const [cname, json] of Object.entries(comps)) {
        const where = { file: entry.file, path: `$.components.${cname}` };
        const type: ComponentType = engine.component(cname, where);
        type.create(json, where);
        for (const ref of collectRefs(type.schema, json, ['components', cname]))
          push(refError(engine, ref, entry.file, `prefab "${id}"`));
      }
    } catch (err) {
      errors.push(
        toEngineError(err, {
          code: 'PREFAB_INVALID',
          what: `Prefab "${id}" failed`,
          where: { file: entry.file },
        }),
      );
    }
  }
  const rooms = c.ids(RoomKind).filter((id) => c.entry(RoomKind, id)!.pack === gamePack);
  for (const id of rooms) {
    const file = c.entry(RoomKind, id)!.file;
    try {
      engine.loadRoom(id);
    } catch (err) {
      errors.push(
        toEngineError(err, {
          code: 'ROOM_LOAD_FAILED',
          what: `Room "${id}" failed to load`,
          where: { file },
        }),
      );
      continue;
    }
    const w = engine.world;
    for (const e of w.entities()) {
      for (const type of w.componentsOf(e)) {
        for (const ref of collectRefs(type.schema, w.get(e, type))) {
          if (ref.kind !== 'entity') {
            push(refError(engine, ref, file, `${w.label(e)} ${type.name}`));
            continue;
          }
          const ok = ref.id.startsWith('#')
            ? w.tagged(ref.id.slice(1)).length > 0
            : w.named(ref.id) !== undefined;
          if (ok) continue;
          const names = w
            .entities()
            .map((x) => w.nameOf(x))
            .filter((n): n is string => !!n && !n.startsWith('grid:'));
          errors.push(
            new EngineError({
              code: 'ROOM_ENTITY_REF_MISSING',
              what: `${w.label(e)} ${type.name}${ref.path.slice(1)} targets "${ref.id}", which is not in room "${id}"`,
              where: { file },
              why: didYouMean(ref.id, names),
              fix: 'Give the target entity that "name" in the room, or use "#tag" to address tagged entities.',
            }),
          );
        }
      }
    }
  }
  return { game: name, files, rooms: rooms.length, prefabs: c.ids(PrefabKind).length, errors };
}
