# Engine review and completion for the signature game

## Baseline

The initial engine already had a sound public API, ECS and fixed-step loop, headless simulation,
Rapier characters and physics, Three rendering, procedural data assets, signal-driven level logic,
FPS weapons, simple enemy AI, an editor and tool-assisted testing. All 37 original tests passed.
The bundled game was a collection of demonstrations. It did not yet support a sustained loot
combat game, persistent builds, systemic elements, advanced traversal or an endless content loop.

## Added reusable capabilities

- **Action plugin:** directional dash, momentum slide, one or more air jumps, low-ledge mantle,
  collision capsule crouching and third/first-person animation states. Camera shoulder offsets
  respect world geometry. The headless aim helper solves rotated shoulder offsets too.
- **Combat plugin:** optional combat statistics, elemental state, delayed area attacks, timed burns,
  frost slows, conductivity, thermal reactions, critical hits, leech and bounded kill explosions.
  Existing games retain their damage behavior when no combat statistics are present.
- **Instance weapon data:** a `Weapon` on an actor overrides the selected prefab's statistics.
  Procedural equipment can change damage, spread, rate and model without mutating shared content.
- **Content grammar:** compatible weighted token composition, independently seeded per slot.
- **Experience arithmetic:** closed-form level costs and logarithmic reward resolution.
- **SaveStore:** injected storage, versioned schemas, last-valid backups and graceful storage failure.
- **Runtime palettes:** recolor a procedural room without changing the authored look assets.
- **Selective visual filters:** per-model environment/subject categories, banded toon lighting,
  depth/normal ink edges, graphic-novel halftone and vivid color. Runtime preferences survive
  room palettes; Rift Runner defaults to cel shading and migrates existing saves without losing progress.
- **Stable HUD updates:** reconcile trusted markup while retaining interactive DOM elements and focus.
- **Kit composition:** `fpsKit({ hud: false })` allows a game's own interface while reusing FPS behavior.
- **Renderer fixes:** live tint changes now rebuild affected models; replaced sky and label materials
  and post-processing buffers are disposed, and shared geometry is released after its final live
  instance. Transparent effects do not occlude one another. These fixes matter for repeated room transitions and palette changes.

Every new runtime feature remains a small module, optional component or plugin. Game code imports
only `#engine/api.ts`; tests also use `#engine/testing.ts`. Component/content schemas continue to
generate editor metadata, reference docs and JSON Schemas from the same definitions.

## Game-specific systems

Rift Runner adds a validated vocabulary, equipment rolling, skill nodes, mastery, vendors, a town,
seeded combat arenas, configurable boss patterns, six independent difficulty sliders, abilities,
loot collection and a complete death/clear/return/continue loop. The same retained player entity
and FPS weapon models now have an animated third-person exterior. Original showcase rooms remain
available at `?launcher=1`.

## Verification strategy

The room tests shoot through a full expedition and advance to the next lesson; other tests verify
standing still is dangerous, death revives the same player, difficulty changes preserve health
fractions, dashes cannot pass through walls, air jumps are bounded, crouching respects ceilings,
elemental reactions do not recurse, and equipped stats do not mutate shared assets. Progression
checks cover prerequisites, transactions, deterministic generation, lessons and deep finite state.
Save tests exercise invalid data, wrong versions, corruption recovery and storage failures.

Browser checks complement headless tests: actual mouse/keyboard input, pointer capture, pause,
skill spending, equipment, sliders, camera switching, abilities, reload persistence, viewport sizes,
console errors and screenshots. Visual review specifically checks telegraph readability, character
silhouettes, camera clearance and HUD overlap. Production builds are checked separately.

## Verified on 2026-10-14

- `npm run check`: 65/65 tests; types, lint, architecture and 423 content files across 12 rooms pass.
- `npm run build`: succeeds. The bundled engine dependency chunk still produces Vite's size
  warning (about 4.7 MB minified / 1.7 MB gzip).
- Chromium tests against both the dev server and production preview: movement, skill purchase,
  equipment, six-slider settings, abilities, camera changes, pause and persisted settings pass
  without browser or engine errors. Actual slider edits and a skill purchase survive reload.
- Eight town/expedition round trips (16 room transitions) retain the same GPU texture, geometry
  and shader-program counts at each return to town. This complements the geometry lifecycle test.
- Visual-filter checks cover shared-palette isolation, lighting-ramp disposal, save migration,
  all four styles and three scopes, first-person weapons, keyboard controls and 700×560 settings.
  Pixel comparisons with shared bloom disabled isolate the selection mask: over 99.8% of
  unselected interior pixels stay within four display-channel values of the original.
  Sixty filter switches and ten room transitions retain 38 textures, 228 geometries and 22
  programs on every return to cel-shaded town. Production browser checks report no errors.
- Boss telegraphs, HUD, 1440×900 and 960×640 layouts, keyboard focus and the original gallery were
  inspected in the browser. Browser tests use software rendering; hardware frame-rate benchmarking
  is separate from these correctness checks.

## Scope

The engine is complete for this procedural single-player showcase. It remains intentionally small:
no network multiplayer, external asset pipeline, scripting sandbox or cloud persistence was added.
The reusable systems provide a foundation for expanding the game without one-off level scripts.
