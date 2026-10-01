# 0001: Rapier 0.21, SIMD build, for physics

**Status:** accepted

## Context

FPS gameplay needs a character controller (steps, slopes, snapping), sensors for triggers,
fast raycasts for hitscan weapons, and dynamic props that can be pushed and exploded. The
engine must run the same simulation headless in Node (tests, tools) and in the browser.

## Decision

Use `@dimforge/rapier3d-simd-compat@0.21.0`: the SIMD build, with the WASM embedded so it
loads the same way in Node and in Vite without file-serving setup. All access goes through
`engine/physics/Physics.ts` (bodies are created lazily from `Body`/`CharacterBody` components,
kinematic character movement uses Rapier's controller, sensors become `TriggerEntered/Exited`
events).

## Consequences

- One physics world per room, rebuilt on room load; deterministic for a seed and tick rate.
- SIMD needs WebAssembly SIMD (all current browsers and Node 22).
- Rapier changes between minor versions; look up signatures with `npm run api -- rapier <name>`
  rather than from memory. Upgrades touch only `engine/physics/`.
