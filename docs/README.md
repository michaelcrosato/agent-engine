# Docs index

Start with [AGENTS.md](../AGENTS.md) (principles, conventions, architecture map, workflows).
Each doc below is short and covers one topic. Print one with `npm run docs -- <name>`, or
search them all with `npm run docs -- "<words>"`.

## Rift Runner

| Doc | What it covers |
| --- | --- |
| [Play guide](rift-runner.md) | Controls, town services, progression, difficulty and saves |
| [Endless content](endless-content.md) | Modular vocabulary, encounter generation and systemic interactions |
| [Engine review](engine-review.md) | Baseline audit, engine additions, validation and scope |

## Building games

| Doc | What it covers |
| --- | --- |
| [rooms](rooms.md) | Rooms, grid text maps, glyphs, placements, spawn points, exits |
| [prefabs](prefabs.md) | Prefabs, `extends`, `with` overrides, tags, tuning presets |
| [logic](logic.md) | Signals, triggers, counters, timers, buttons, doors, messages |
| [fps-kit](fps-kit.md) | The FPS kit and the reusable mechanics (health, weapons, AI, pickups...) |
| [puppets](puppets.md) | Procedural models from primitive parts, animation clips, the Animator |
| [looks](looks.md) | Looks (sky, fog, lights, material palette) and post-processing stacks |
| [textures](textures.md) | Procedural texture recipes |
| [sounds](sounds.md) | Synth sound patches |
| [music](music.md) | Step-sequenced songs with chords and generated melodies |

## Engine and code

| Doc | What it covers |
| --- | --- |
| [ecs](ecs.md) | Components, systems, phases, events, services, plugins, games |
| [data-packs](data-packs.md) | Content kinds, data packs and precedence, validation, hot reload |
| [errors](errors.md) | Teaching errors: reading them, throwing them |

## Tools and testing

| Doc | What it covers |
| --- | --- |
| [testing](testing.md) | Room tests, the Playtest API, scripted steps, captures |
| [tools](tools.md) | CLI and MCP tools, screenshots, the one check |
| [editor](editor.md) | In-browser level editor, debug overlay, hot reload |

## Reference and decisions

- [reference/components.md](reference/components.md): every component and field (generated)
- [reference/content-kinds.md](reference/content-kinds.md): every data file kind (generated)
- [decisions/](decisions/): why the stack is what it is
  - [0001 Rapier 0.21 SIMD](decisions/0001-rapier-simd.md)
  - [0002 TypeScript 7, erasable syntax, no build step](decisions/0002-typescript-7.md)
  - [0003 zod schemas as the single source](decisions/0003-zod-schemas.md)
  - [0004 Data packs](decisions/0004-data-packs.md)
  - [0005 WebGL renderer](decisions/0005-webgl-renderer.md)
  - [0006 Headless-first testing](decisions/0006-headless-first.md)
