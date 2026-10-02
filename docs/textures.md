# Procedural textures

A texture is a recipe of ordered paint ops (`data/textures/<id>.json`), rendered to tileable
albedo, normal (from height), roughness, and emissive maps when a look first uses it.

```json
{
  "doc": "Weathered red bricks with light efflorescence.",
  "seed": 2,
  "roughness": 0.9,
  "normal": 2.5,
  "layers": [
    { "op": "fill", "color": "#6b6460" },
    { "op": "bricks", "rows": 8, "cols": 4, "color": "#8a4b38", "mortar": "#5a5550" },
    { "op": "noise", "scale": 16, "octaves": 3, "color": "#000000", "amount": 0.25, "height": 0.3 },
    { "op": "noise", "kind": "ridged", "scale": 8, "threshold": 0.72, "color": "#d8d2c8", "amount": 0.18 }
  ]
}
```

- Top level: `size` (power of two; 32–64 for pixel art), `seed`, base `roughness`, `normal`
  strength (0 = flat).
- Ops: `fill`, `noise`, `cells`, `bricks`, `tiles`, `planks`, `stripes`, `checker`, `lines`,
  `rivets`, `scratches`, `spots`, `gradient`.
- Most ops share style fields: `color`, `amount` (opacity), `blend` (how it mixes with the
  layers below), `height` (adds relief to the normal map), `rough` (set roughness where it
  paints), `glow` (emissive, for lights and lava).
- Everything tiles seamlessly. Fields per op: `npm run tool -- describe texture`, or read
  `engine/gen/texture/ops/<op>.ts`. A new op is a `defineTextureOp` file listed in `textureOps.ts`.

## Using a texture

Point a look material at it: `"materials": { "wall": { "texture": "bricks", "tile": 2 } }`
(`tile` = meters per repeat). Grid surfaces use world-space UVs, so textures line up across
merged blocks.

## Checking a texture

```sh
npm run tex -- bricks     # out/textures/bricks.png: albedo, normal, roughness, emissive, 2×2 tiling check
npm run tex -- all
```

Look at the 2×2 tiling image for seams, then at the room: `npm run shot -- agent-engine/looks`.
