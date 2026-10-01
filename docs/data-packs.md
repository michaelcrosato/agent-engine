# Data packs and content kinds

All data is JSON in `data/<folder>/<id>.json` (ids can include subfolders: `inst/kick`).
Each folder is a **content kind** with a schema: rooms, prefabs, tuning, input, clips, sounds,
music, puppets, looks, post, textures, effects. List them with `npm run tool -- list kinds`;
see one with `npm run tool -- describe sound` or [reference/content-kinds.md](reference/content-kinds.md).

## Packs and precedence

| Pack | Folder | Brought by |
| --- | --- | --- |
| `engine` | `engine/data/` | always |
| `mechanics` | `engine/mechanics/data/` | the mechanic plugins |
| `kit:fps` | `engine/kits/fps/data/` | the FPS kit |
| `game:<name>` | `games/<name>/data/` | the game |

A game loads the packs its plugins name (`definePlugin({ data: 'mechanics' })`), in that order.
A later pack shadows an earlier file with the same kind and id, so a game can replace
`engine/data/sounds/jump.json` by adding `games/<g>/data/sounds/jump.json`.

## Validation

- Files are parsed with positions, so errors say file, line, column, and JSON path.
- Every file is validated against its kind's schema on load. One bad file never blocks the rest;
  its errors show in the red panel (browser) and in `npm run check` (content step).
- `npm run tool -- validate <game>` also checks references between files (prefab → puppet, room
  → look, clip ids in puppets, signal targets inside rooms) and builds every room headless.
- Editor autocomplete: `schemas/*.schema.json` are generated and mapped in `.vscode/settings.json`.

## Hot reload

`npm run dev` watches data files. A changed file is re-validated and applied in place:
rooms/prefabs/puppets/tuning rebuild the room (the player stays put), looks/textures/post
re-skin, sounds re-synthesize and play once, songs restart if playing.

## New content kinds

A plugin can add its own kind:

```ts
export const QuestKind = defineContentKind({ name: 'quest', folder: 'quests', doc: '...', schema: QuestSchema });
definePlugin({ name: 'quests', doc: '...', contentKinds: [QuestKind] });
// in a system: ctx.content.get(QuestKind, 'intro')
```
