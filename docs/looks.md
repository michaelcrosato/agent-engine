# Looks and post-processing

A **look** (`data/looks/<id>.json`) is a room's visual style: sky, fog, ambient and sun light,
exposure, tone mapping, render scale, a post stack, and the named **material palette** that
every model and grid surface uses. Rooms pick one with `"look"`; signals switch it at runtime
(`{ "look": "night" }`); URLs override it with `&look=neon`.

```json
{
  "doc": "Night: dark blue sky with stars, dim moonlight; rely on placed Light entities.",
  "extends": "default",
  "sky": { "top": "#05070f", "horizon": "#1a2238", "bottom": "#05060a", "stars": 1 },
  "fog": { "color": "#0e1424", "near": 12, "far": 70 },
  "ambient": { "sky": "#5a6a9a", "ground": "#14100c", "intensity": 0.35 },
  "sun": { "color": "#a8b8ff", "intensity": 0.5, "dir": [0.3, -1, 0.5] },
  "exposure": 1.2,
  "post": "cinematic",
  "materials": { "wall": { "color": "#4a5060", "texture": "concrete" } }
}
```

- `extends` merges a parent look field by field, materials included, so a look can change
  only what differs.
- Materials: `type` (`standard`, `unlit`, `glow`, `glass`, `toon`), `color`, `texture` (a
  texture recipe id), `tile` (meters per texture repeat), `roughness`, `metalness`,
  `emissiveIntensity`, `opacity`, `flat`, `pixelated`, `doubleSided`. Unknown material names
  render magenta and log once.
- Common names: `floor`, `wall`, `ceiling`, `concrete`, `metal`, `steel`, `wood`, `crate`,
  `bricks`, `rock`, `dirt`, `grate`, `hazard`, `lava`, `glass`, `glow`, `glow-red|green|blue`,
  `accent`, `enemy`, `gun`, `dark`, `white`, `water`. The agent-engine looks room shows swatches.
- Engine looks: `default`, `night`, `neon`, `retro`, `dusk`, `industrial`.
- Exact fields: `npm run tool -- describe look`.

## Post stacks (`data/post/<id>.json`)

Ordered passes applied after the scene renders:

```json
{ "passes": [
  { "type": "bloom", "strength": 0.55, "radius": 0.5, "threshold": 0.85 },
  { "type": "grade", "saturation": 0.85, "contrast": 1.15, "tint": "#fff2e0" },
  { "type": "vignette", "amount": 0.7, "softness": 0.45 }
] }
```

Pass types: `bloom`, `vignette`, `grade`, `grain`, `chromatic`, `pixelate`, `scanlines`,
`posterize`, `fxaa`. Stacks: `default`, `none`, `cinematic`, `retro`, `neon`.

## Selective visual filters

Games can set a persistent runtime treatment independently of the current room look:

```ts
engine.tryService(RendererKey)?.setVisualFilter({ style: 'cel', scope: 'scene' });
```

Styles are `none` (authored lighting), `cel` (four-band toon light and ink edges), `graphic`
(toon light, stronger ink and warm halftone print), and `vivid` (saturation and warm highlights).
Scopes are `scene`, `environment`, and `subjects`. `VisualFilterSchema` and `VisualFilter`
are public exports. The engine defaults to `none`; Rift Runner saves `cel` / `scene` as its default.

`Model.filterGroup` is `subject` by default. Mark terrain, buildings and vegetation
`environment`; grid floor/wall/ceiling models do this automatically. Rift Runner's scenery
helper marks architecture and landscape, while actors, weapons, loot and interactive props
are subjects. The first-person weapon participates too. Classification updates at runtime.

Selected opaque lit materials use a shared nearest-filtered lighting ramp. Unlit emission,
glass and transparent combat effects retain their authored material behavior. A full-resolution
normal/depth capture provides visible-surface categories and ink contours before display passes
and antialiasing; no hidden-character outlines show through walls. Transparent effects and world
labels are excluded from that capture to avoid hard rectangular edges, so their post color treatment
follows the opaque surface behind them. The sky belongs to the environment. DOM HUD is unaffected.
Room bloom remains shared: a filtered object's glow can still spill onto nearby scenery.

Changing rooms or recoloring a procedural biome retains the filter preference. Changing filters
releases the old composer, surface/depth buffers, materials and lighting ramp. `none` skips the
extra capture and composite; active filters add one geometry pass and one fullscreen pass.

## Seeing the result

```sh
npm run shot -- agent-engine/looks --look night --views player
npm run shot -- agent-engine/arena --cam 10,6,30 --at 20,0,10
```

Edits to looks, post stacks, and textures hot-reload in the browser without rebuilding the room.
