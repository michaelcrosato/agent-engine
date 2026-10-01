# Rooms

A room is one playable space: `games/<game>/data/rooms/<id>.json` plus `<id>.test.ts` beside it.
Scaffold one with `npm run new -- room <id>` (or `--from <existing>` to copy a room and its test).

```json
{
  "doc": "What this room is for.",
  "look": "default",
  "music": "calm",
  "tuning": [],
  "grid": {
    "cell": 2,
    "wallHeight": 5,
    "legend": { "~": { "material": "lava", "prefab": "hazard-zone" } },
    "rows": [
      "#########",
      "#.......#",
      "#..12...#",
      "#~~.....#",
      "#...P...#",
      "#########"
    ]
  },
  "entities": [
    { "prefab": "crate", "cell": [5, 2] },
    { "prefab": "door", "name": "door-1", "pos": [9, 0, 3], "rot": 90 },
    { "prefab": "exit", "cell": [7, 1], "with": { "RoomExit": { "room": "hub", "spawn": "from-x" } } }
  ]
}
```

## Grid text maps

- Column → +X, row → +Z. The top row is north (−Z). Cell centre:
  `((col + 0.5) · cell, floor, (row + 0.5) · cell)`.
- Default glyphs: `#` wall (full height), `.` floor, `_` pit (no floor), space = void,
  `P` player spawn, `=` 1 m low wall, `1`–`9` floor raised by 0.5 m per step (stairs: `1234`).
- `legend` adds or overrides glyphs. A tile can set `floor` (height or `null`), `wall` (`true`
  or a height), `material`, `wallMaterial`, and a `prefab` (+ `rot`, `with`) placed at the cell.
- Cells merge into as few boxes as possible (greedy rectangles), so big rooms stay cheap.
- `ceiling: true` closes the room at `wallHeight`.
- See any room as ASCII with rulers and entities: `npm run tool -- map <game>/<room>`.

## Placements (`entities`)

| Field | Meaning |
| --- | --- |
| `prefab` | Prefab id (required) |
| `name` | Unique name: target for signals, tests (`t.pos('door-1')`), and the editor |
| `pos` or `cell` | World position `[x, y, z]`, or a grid cell `[col, row]` placed on that cell's floor |
| `rot` | Yaw degrees (0 faces −Z, positive turns left), or `[x, y, z]` Euler degrees |
| `scale` | Number or `[x, y, z]` |
| `with` | Component overrides merged over the prefab: `{ "Health": { "max": 200 } }`. Can add components too |
| `tags` | Extra tags (address groups of entities with `"#tag"` in signals) |

## Spawning the player and moving between rooms

- The game's `playerPrefab` spawns at a SpawnPoint. A `P` glyph is a spawn with id `default`;
  name others with `{ "prefab": "spawn", "name": "spawn-east", "with": { "SpawnPoint": { "id": "east" } } }`.
- Entities tagged `persist` (the player) survive room changes.
- An exit pad: `{ "prefab": "exit", "with": { "RoomExit": { "room": "keys", "spawn": "from-hub" } } }`.
  Lock it with `"locked": true` and open it with an `unlock` signal.
- URL: `?game=<g>&room=<id>&spawn=<id>`. Tests: `playtest(game, room, { spawn })`.

## Checking a room

```sh
npm run tool -- validate <game>                    # builds every room headless, checks refs and names
npm run shot -- <game>/<room> --views player,top   # see it
npm run play -- <game>/<room> --steps '[{"walkTo":"exit-hub"}]'
```

Every room needs a test (`npm run check` enforces it); see [testing](testing.md).
