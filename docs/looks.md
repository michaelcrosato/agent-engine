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
  `accent`, `enemy`, `gun`, `dark`, `white`, `water`. The fps-demo looks room shows swatches.
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

## Seeing the result

```sh
npm run shot -- fps-demo/looks --look night --views player
npm run shot -- fps-demo/arena --cam 10,6,30 --at 20,0,10
```

Edits to looks, post stacks, and textures hot-reload in the browser without rebuilding the room.
