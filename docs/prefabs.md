# Prefabs and tuning

A prefab is an entity template: `data/prefabs/<id>.json`.

```json
{
  "doc": "Melee robot: runs at you and claws.",
  "extends": "enemy-base",
  "tags": ["enemy"],
  "components": {
    "Model": { "puppet": "grunt" },
    "Brain": { "style": "melee", "speed": 4.2, "attackDamage": 12 }
  }
}
```

- `components` maps component names to fields. Missing fields take their defaults. Every
  field is validated when the prefab spawns, and errors point at the file and JSON path.
- `extends` merges a parent field by field (objects merge, arrays and values replace).
  Chains are fine; cycles are reported.
- `tags` are added to every instance. Systems and signals use them (`#enemy`, `player`, `persist`).
- See what a prefab resolves to: `npm run tool -- describe prefab:<id>`.
- Fields of a component: `npm run tool -- describe Health` or [reference/components.md](reference/components.md).

## Order of overrides at spawn

1. The prefab chain (`extends`), parent first.
2. Active tuning presets: the game's `tuning`, the room's `tuning`, then extra ones (`?tuning=`,
   or `playtest(..., { tuning })`).
3. The placement's `with`.

## Tuning presets

`data/tuning/<id>.json` changes game feel without editing prefabs. Overrides by prefab apply
to every prefab that extends it; overrides by tag apply to entities with that tag.

```json
{
  "doc": "Tougher, faster robots that hit harder.",
  "prefabs": { "grunt": { "Health": { "max": 100 }, "Brain": { "speed": 5.5 } } },
  "tags": { "enemy": { "Brain": { "aggressive": true } } }
}
```

Try one live with `?tuning=hard`, or compare in a test (`games/agent-engine/data/rooms/arena.test.ts`).

## Spawning from code

```ts
const e = ctx.spawn('barrel', { pos: [3, 0, 4], rot: 90, with: { Health: { max: 10 } }, name: 'b1' });
```
