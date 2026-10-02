# Agent Engine

A general-purpose 3D game engine designed to be built with AI coding agents.
TypeScript + Vite, Three.js r186, Rapier 0.21 (SIMD). Every asset is procedural: models are
trees of primitive parts, textures are paint-op recipes, sounds are synth patches, music is a
chord-aware step sequencer, and animations are keyframe or sine clips, all as JSON data.

```sh
git clone https://github.com/michaelcrosato/agent-engine.git
cd agent-engine
npm install        # Node >= 22.18
npm run dev        # http://localhost:5173: pick a room; add &edit=1 for the level editor
npm run check      # types, lint, architecture rules, data validation, every room as a headless test
```

The Agent Engine game, `games/agent-engine`, is a hub with eight showcase rooms: movement, shooting range,
physics, arena waves, doors and keys, audio, looks, and puppets. Each room has a headless test
that plays it.

- **Agents (and people) start with [AGENTS.md](AGENTS.md).**
- Topic docs: [docs/README.md](docs/README.md), or `npm run docs`.
- Tools (CLI and MCP): `npm run tool -- --help`. They cover scaffolding, validation,
  screenshots, headless play, sound/music/texture rendering, and API lookup.
