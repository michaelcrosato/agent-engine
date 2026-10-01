# Errors that teach

Mistakes in data or code produce an `EngineError` that says what went wrong, where, why, and
how to fix it:

```
✖ CLIP_PART_MISSING: Clip "critter-walk" animates "hipBX", but puppet "critter" has no such part
  at games/fps-demo/data/puppets/critter.json $.clips.walk
  why: Did you mean "hipBL" or "hipBR" or "hipFL"?
  fix: Point the clip track "part" at a puppet part id, or give that part an "id" in the puppet.
```

- `code`: stable, greppable id (`CONTENT_NOT_FOUND`, `SCHEMA_INVALID`, `JSON_SYNTAX`,
  `COMPONENT_UNKNOWN`, `ROOM_ENTITY_REF_MISSING`, ...).
- `where`: `file`, JSON `path`, `line`/`col` when known, `entity`, `component`, `system`.
- `why`: the cause, often a "did you mean" from edit distance.
- `fix`: the next action, usually a command.

Where they appear: test failures, `npm run check` (content step lists all data errors),
tool output, and the red panel in the browser (click to dismiss). Data errors never stop other
files from loading.

## Throwing them

```ts
import { EngineError } from '#engine/api.ts';

throw new EngineError({
  code: 'JETPACK_NO_FUEL_KIND',
  what: `Jetpack on ${ctx.world.label(e)} uses fuel "${j.fuel}", which no Inventory tracks`,
  where: { entity: ctx.world.label(e), component: 'Jetpack' },
  why: 'Inventory.ammo has no entry with that name.',
  fix: 'Add it to the player prefab: "Inventory": { "ammo": { "fuel": 100 } }',
});
```

- Throw them for anything a person or agent can fix. Use plain `Error` only for engine bugs.
- `err.at({ file, path })` adds location to an error thrown by deeper code. Inside the engine,
  `toEngineError(err, fallback)` (engine/core/EngineError.ts) wraps unknown errors.
- Validation errors come for free from schemas: field type, range, enum values, unknown keys
  (with the allowed keys and a suggestion), and the file position of the bad value.
