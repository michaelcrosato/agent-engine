# Puppets, clips, and animation

Models are built from primitive **parts** at load time; nothing is imported from 3D files.

## Puppets (`data/puppets/<id>.json`)

```json
{
  "doc": "Windmill: lathe tower, hub, four blades on a spinning joint.",
  "parts": [
    { "id": "tower", "shape": "lathe", "size": [1.2, 3, 1.2], "profile": [[0.6, 0], [0.45, 1.5], [0.3, 3]], "material": "wood" },
    { "id": "blades", "shape": "box", "size": 0.1, "pos": [0, 2.9, -0.6], "pivot": "center", "hidden": true },
    { "id": "b1", "parent": "blades", "shape": "box", "size": [0.25, 1.4, 0.04], "pos": [0, 0.1, 0], "material": "white" }
  ],
  "clips": { "idle": "windmill-spin" }
}
```

- Shapes: `box`, `sphere`, `capsule`, `cylinder`, `cone`, `torus`, `plane`, `wedge`,
  `lathe` (`profile`: `[radius, y]` points), `extrude` (`points`: an `[x, y]` outline; depth = `size.z`).
- `size` is the full size; `pos` places the part's **pivot** relative to its parent;
  `pivot` is `bottom` (default), `center`, or `top`. Rotate an arm about its shoulder with
  `pivot: "top"`.
- `rot` is yaw degrees or `[x, y, z]` Euler degrees applied in Y, X, Z order. `parent` must be
  listed earlier. A `hidden` part is a joint: it moves its children without drawing anything.
- `material` is a name from the active look's palette (`wall`, `metal`, `glow-red`, ...), so
  one model re-skins with the look. `color` tints it.
- `clips` maps roles to clip ids. AI uses the roles `idle`, `walk`, `attack`.
- Puppets in the engine and kits: `grunt`, `gunner`, `turret`, `crate`, `lamp`, `door`, the
  viewmodels `vm-*`, ... Browse them in the fps-demo **puppets** room.

## Clips (`data/clips/<id>.json`)

Clips add offsets on top of each part's rest pose:

```json
{
  "doc": "Critter scuttle: diagonal leg pairs swing in opposition.",
  "duration": 0.6,
  "tracks": [
    { "part": "hipFL", "prop": "rot.x", "wave": { "amp": 25, "freq": 1.6667 } },
    { "part": "hipFR", "prop": "rot.x", "wave": { "amp": 25, "freq": 1.6667, "phase": 0.5 } },
    { "part": "blades", "prop": "rot.z", "keys": [[0, 0], [2, 360]], "ease": "linear" }
  ]
}
```

- `prop`: `pos.x|y|z` (meters), `rot.x|y|z` (degrees), `scale` / `scale.x|y|z` (multiplies).
- A track uses `keys` (`[time, value]` with an `ease`) or a `wave`:
  `offset + amp · sin(2π(freq · t + phase))`. Loop cleanly by making `freq · duration` whole.
- `npm run tool -- validate <game>` reports clip tracks that name parts the puppet lacks
  (`CLIP_PART_MISSING`) and `Animator.play` values that are neither roles nor clips.

## Playing clips

- `Animator` component: `play` is a role or a clip id; changing it crossfades over `fade`.
  `speed` scales time. Level logic can switch it with a `play:<role>` signal.
- `Motion` component: constant `spin` (deg/s per axis) and `bob` for props and pickups.
- `Mover` component: moves an entity between points (doors, lifts, platforms) and carries riders.
- Clip sampling runs in the browser `frame` phase only, so headless tests check `Animator.play`
  rather than poses. See the result with `npm run shot`.
