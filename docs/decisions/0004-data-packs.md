# 0004: Data packs with shadowing

**Status:** accepted

## Context

The engine, the reusable mechanics, genre kits, and each game all ship data (sounds, puppets,
prefabs, looks). Games must be able to use everything and replace anything without forking.

## Decision

Data lives in packs: `engine/data` (pack `engine`), `engine/mechanics/data` (`mechanics`),
`engine/kits/<kit>/data` (`kit:<kit>`), `games/<g>/data` (`game:<g>`). A game loads the packs
its plugins declare (`definePlugin({ data })`) in plugin order, then its own. A file with the
same kind and id in a later pack shadows the earlier one. Unknown folders are errors only in the
game's own pack.

## Consequences

- A game overrides a sound or prefab by adding a file with the same id; no engine edits.
- Tools (`validate`, `describe`, `list`) see exactly what the game sees.
- Ids are global per kind within a game, so prefer specific names (`arena-grunt`, `vm-shotgun`).
