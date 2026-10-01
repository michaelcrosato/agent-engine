# 0005: Three.js WebGLRenderer (not WebGPU) for now

**Status:** accepted; revisit when WebGPU is everywhere we need it

## Context

Three r186 offers `WebGLRenderer` and `WebGPURenderer`. Agents verify visuals with headless
Chromium screenshots, which run on software rendering (SwiftShader) in CI and sandboxes.

## Decision

Use `WebGLRenderer` with `EffectComposer` post passes (bloom, grade, vignette, pixelate, ...).
Materials are built from look palettes (`MeshStandardMaterial` and friends) with procedural
textures as `DataTexture`s.

## Consequences

- Screenshots work headless without a GPU (`--use-angle=swiftshader`).
- Shadows use `PCFShadowMap` (r186 removed `PCFSoftShadowMap`).
- Moving to WebGPU later touches `engine/render/` only: models, looks, and data stay the same.
