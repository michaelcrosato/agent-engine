# AGENTS.md

A general-purpose 3D game engine built for AI coding agents: TypeScript + Vite, Three.js r186,
Rapier 0.21 (SIMD build). Every asset is generated from code or data: models, textures, sound
effects, music, animations. Nothing binary is checked in (UI fonts may be downloaded).

Read this file once. Everything else lives in small docs: `npm run docs`.

## Start here

```sh
npm install                  # Node >= 22.18 runs the .ts files directly
npm run check                # the one check: types, lint, rules, content, schemas, all tests
npm run dev                  # http://localhost:5173 : launcher, then ?game=fps-demo&room=arena
npm run docs                 # docs index;  npm run docs -- rooms   npm run docs -- "signal"
npm run tool -- --help       # every tool; also served over MCP (.mcp.json → engine_<name>)
```

Useful URL flags: `&edit=1` level editor, `&debug=1` debug overlay, `&look=neon`,
`&tuning=hard`, `&spawn=<id>`, `&seed=7`. On the dev server, F2 opens the editor in any room.

## Principles, in priority order

1. **Gameplay first.** Make it playable, then make it good. Features are small plugins and data
   files so ideas can be prototyped in minutes and thrown away just as fast.
2. **Use tools.** Do not guess. Look at the room (`shot`, `map`), run it (`play`), hear it
   (`sfx`, `music`), look up real signatures (`api`), validate (`check`). If a task needs a
   tool that does not exist, scaffold one: `npm run new -- tool <name>`.
3. **Optimization and compatibility come later.** Clear code that works beats fast code that
   might. Profile (`&debug=1`) before optimizing.
4. **Approximations are fine if they feel right.** Fake physics, sine-wave animation, and
   cheap shaders are welcome when the result reads well in play.

When an instruction conflicts with these, the earlier principle wins.

## How the codebase is written

- **One obvious way to add things:** `npm run new -- <kind> <name>`
  (`game`, `room`, `mechanic`, `component`, `system`, `tool`, `look`, `sound`, `prefab`,
  `puppet`, `clip`, `texture`, `music`, `effect`, `tuning`, `post`). It prints the next steps.
- **Data first.** Rooms, prefabs, puppets, clips, looks, post stacks, sounds, songs, textures,
  effects, input maps, and tuning presets are JSON under `data/<kind>/`. Grid rooms use a
  text map. Data is validated on load and hot-reloaded in the browser.
- **One schema, many uses.** A component or content kind is declared once with `field.*`/zod.
  That one declaration gives validation, defaults, TypeScript types, JSON Schemas for editor
  autocomplete (`schemas/`), reference docs (`docs/reference/`), the editor inspector, and
  tool arguments for the CLI and MCP.
- **Readable in one pass.**
  - One concept per file, about 300 lines at most (400 is a hard error).
  - The file name matches its primary export (`Health.ts` exports `Health`).
  - Folders follow the architecture map below.
  - No decorators, default exports, hidden globals, or import side effects. Dependencies arrive
    through `ctx` (systems), `engine` (plugin hooks), or typed services.
- **Errors that teach.** User mistakes throw `EngineError` with `code`, `what`, `where`
  (file, JSON path, line, entity, component, system), `why` (often "did you mean"), and `fix`.
  Never throw a bare `Error` for something a person or agent can fix.
- **Compact by default.** Tools print short summaries. Big outputs (captures, WAVs, PNGs, full
  logs) go to `out/`, and the summary lists the files.
- **Pinned sources beat memory.** Libraries change. Before using a three/rapier/zod/vite API,
  check it: `npm run api -- three TransformControls` (searches the installed sources and `.d.ts`).
- **Examples are tests.** Every room has `<room>.test.ts` next to it and runs headlessly in
  `npm run check`. The rules check fails if a room has no test.
- **Games import only `#engine/api.ts`.** Tests may also import `#engine/testing.ts`.
  Engine internals import each other by relative path. Engine code never imports games or tools.
- **TypeScript is erasable only** (Node runs it without a build step): no `enum`, no
  `namespace`, no constructor parameter properties. Imports include the `.ts` extension.
- **Formatting is Biome's.** `npm run check -- --fix` formats everything, JSON data included.

## Architecture map

```
engine/
  core/        ECS world, engine loop (tick phases), events, services, errors, rng, time
  schema/      field.* helpers, validation with JSON paths, schema walking
  content/     data packs, content kinds, the position-tracking JSON parser
  prefab/      prefabs (extends + with), tuning presets, spawning
  level/       rooms, grid text-maps, spawn points, navigation grid
  physics/     Rapier bodies, character controller, layers, sensors, raycasts
  logic/       signals, triggers, counters, timers, room exits, messages
  anim/        clips, animator, procedural motion, movers (doors, lifts, platforms)
  model/       parts and puppets (procedural models)
  render/      Three.js renderer, looks, materials, post stacks, labels, lights, camera
  audio/       Web Audio output, recorder (headless), ambient sounds
  gen/         procedural generators: texture/, sound/, music/, noise
  fx/          particle effects
  input/       input maps, DOM input, scripted input
  math/        small math helpers (yaw conventions)
  mechanics/   reusable gameplay plugins: health, pickups, doors, projectiles, spawners,
               ai, hazards, interact, targets (+ data/ pack "mechanics")
  kits/fps/    FPS kit: controller, weapons, viewmodel, HUD (+ data/ pack "kit:fps")
  harness/     Playtest API, scripted steps, snapshots (shared by tests and tools)
  node/        Node-only helpers: read data from disk, playtest(), write PNG/WAV
  app/         browser boot: launcher, URL params, hot reload, error panel
  editor/      in-browser level editor (?edit=1)
  debug/       debug overlay (?debug=1)
  data/        engine data pack: input, looks, post, textures, sounds, music, puppets, prefabs
  api.ts       public API for games      testing.ts   test API
  standardPlugins.ts   the plugins every game starts from (physics ... effects)
games/<name>/  game.ts (plugin list) + data/<kind>/*.json + room tests
tools/         CLI + MCP tools (commands/), shared helpers (lib/), Vite plugin (vite/)
templates/     what `npm run new` copies
docs/          small topic docs, decisions/, generated reference/
schemas/       generated JSON Schemas (do not edit)
out/           tool output (git-ignored)
```

Data packs load in this order, later ones shadowing earlier ids:
`engine/data` → `engine/mechanics/data` → `engine/kits/<kit>/data` → `games/<game>/data`.

## Runtime in one paragraph

A **game** is a list of **plugins** (`games/<g>/game.ts`). Plugins bring **components** (plain
data declared with `field.*`), **systems** (functions over queries), **events**, **content
kinds**, and room hooks. Each fixed tick (60 Hz) runs the phases `input → update → physics →
late`; the browser also runs `frame` for rendering. Systems talk through **events** (each system
reads each event once) and **signals** (named actions sent to entities by name or `#tag`,
which is how level logic is wired in JSON). A **room** is a grid text map plus placed prefabs
plus a look and music. Everything also runs headless in Node, which is how tests and tools play
the game.

## Workflows

| Task | Do this |
| --- | --- |
| New room | `npm run new -- room vault --from arena`, edit the JSON (or `&edit=1`), see it with `npm run shot -- fps-demo/vault --views player,top`, write its test, `npm run check` |
| New mechanic | `npm run new -- mechanic jetpack`, register the plugin in `game.ts`, put its data in the game, test it with `playtest(game, room, { plugins: [...] })` |
| Tune feel | Make a tuning preset (`npm run new -- tuning floaty`), try it with `&tuning=floaty` or `playtest(..., { tuning: ['floaty'] })` |
| New sound / song | `npm run new -- sound zap`, then `npm run sfx -- zap` (WAV + spectrogram + numbers). Songs: `npm run music -- <id>` |
| New texture / look | `npm run new -- texture rust`, `npm run tex -- rust`; looks: `&look=<id>` or `npm run shot -- <game>/<room> --look <id>` |
| New model | `npm run new -- puppet drone` (+ `clip drone-idle`), place it in a room, `npm run shot` it |
| Find why a test fails | `npm run play -- <game>/<room> --steps '[...]'` prints events and writes a capture to `out/captures/`; `npm run tool -- map <game>/<room>` shows cells and entities |
| Check visuals | `npm run shot -- <game>/<room> --views player,top` or `--cam x,y,z --at x,y,z`, then look at the PNGs |
| Look up an API | `npm run api -- <three|rapier|zod|vite|engine> <symbol>` |

## Conventions that trip people up

- Signals and events emitted after a receiver ran this tick are seen next tick. In tests, `t.tick()`
  once after `t.press('use')` before asserting effects.
- Bodies sit on their origin: `pivot: "bottom"` by default, so `pos: [x, 0, z]` rests on the floor.
- Yaw 0 faces -Z; positive yaw turns left. `rot: 180` faces +Z (south, toward larger rows).
- Grid: column → +X, row → +Z, the top row is north. Cell centre = `((col+0.5)·cell, floor, (row+0.5)·cell)`.
- Headless runs skip the `frame` phase: no rendering, no clip sampling. Test gameplay state, not visuals.
- Component fields whose doc starts with `State` are runtime state; the editor hides them.
- Commit messages: imperative subject, a short body that says why.
