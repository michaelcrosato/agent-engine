# Agent Engine

A general-purpose 3D game engine designed to be built with AI coding agents.
TypeScript + Vite, Three.js r186, Rapier 0.21 (SIMD). Every asset is procedural: models are
trees of primitive parts, textures are paint-op recipes, sounds are synth patches, music is a
chord-aware step sequencer, and animations are keyframe or sine clips, all as JSON data.

```sh
git clone https://github.com/michaelcrosato/agent-engine.git
cd agent-engine
npm install        # Node >= 22.18
npm run dev        # http://localhost:5173: play Rift Runner
npm run check      # types, lint, architecture rules, data validation, every room as a headless test
```

The signature game, **Rift Runner**, is a single-player loot shooter with dash, slide, double jump,
first/third-person cameras, four weapon families, elemental reactions, a 24-node skill tree and
repeatable mastery. Lastlight is its animated town hub: forge equipment, trade salvage, respec, then
push through eight mechanic-led expeditions into endless seeded combinations of arenas, enemies,
boss patterns, affixes and palettes. Six live difficulty sliders make combat easy to tune and test.
Cel shading is the default look. Settings offers cel, graphic-novel, vivid and original rendering,
applied to the whole scene, only the environment, or only characters and objects.

- [Play guide and controls](docs/rift-runner.md)
- [How to extend the procedural vocabulary](docs/endless-content.md)
- [Engine review and delivered capabilities](docs/engine-review.md)

The original engine gallery remains available at `http://localhost:5173/?launcher=1`.
Its eight showcase rooms cover movement, shooting, physics, arena waves, doors, audio, looks and
puppets. Add `&edit=1` to a room URL for the level editor. Every room has a headless playtest.

- **Agents (and people) start with [AGENTS.md](AGENTS.md).**
- Topic docs: [docs/README.md](docs/README.md), or `npm run docs`.
- Tools (CLI and MCP): `npm run tool -- --help`. They cover scaffolding, validation,
  screenshots, headless play, sound/music/texture rendering, and API lookup.
