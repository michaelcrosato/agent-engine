# FPS kit and mechanics

`fpsKit()` returns every plugin an FPS needs: `standardPlugins()` (physics, level, logic,
anim, audio, render, effects), `mechanicPlugins()` (genre-agnostic gameplay), and `FpsPlugin`.
Add your own plugins after it: `plugins: [...fpsKit(), JetpackPlugin]`.

## Player

The kit's `player` prefab (`engine/kits/fps/data/prefabs/player.json`) is a capsule
`CharacterBody`, a `CameraRig`, `FpsController` (walk/sprint/crouch speeds, acceleration,
jump, gravity, coyote time, jump buffer, footsteps, fall damage), `Health` + `Respawn`,
`Inventory`, `Arsenal` (owned weapons), and `Interactor` (use with E). It is tagged `player`
and `persist` (it survives room changes). Override it per game with `games/<g>/data/prefabs/player.json`,
or tune it with a preset (`games/fps-demo/data/tuning/floaty.json`).

Default bindings live in `engine/data/input/default.json`: WASD, mouse look, Space jump,
Shift sprint, Ctrl/C crouch, Mouse0 fire, E use, R reload, 1-9 and the wheel switch weapons,
Backquote debug overlay. Gamepads use the standard mapping.

## Weapons

Weapons are prefabs with a `Weapon` component (`engine/kits/fps/data/prefabs/weapons/`):
pistol, shotgun, rifle, launcher, wrench. `mode` is `hitscan` (`pellets`, `spread`, `range`),
`projectile` (spawns the `projectile` prefab, e.g. `rocket`), or `melee`. Ammo types are free-form strings
(`bullets`, `shells`, `rockets`); `startAmmo`, `magazine`, `reloadTime`, `rate`, `kick`,
`impulse`, `sound`, and `viewmodel` (a puppet) complete it. Give one to the player with a
`pickup-<weapon>` prefab or `Arsenal.weapons`.

## Mechanics (engine/mechanics/)

| Plugin | Components | What it does |
| --- | --- | --- |
| health | Health, Respawn | Damage, armor, regen, death (prefab/effect/signals), respawn; falling out of the world kills |
| projectiles | Projectile, Explosive | Rockets and fireballs, explosions with falloff and impulse, chain reactions |
| pickups | Pickup, Inventory | health, armor, ammo, weapon, key, item pickups (with respawn) |
| doors | Door | Sliding doors: proximity, keys (`red`, `blue`, ...), signals |
| interact | Interactable, Interactor | Look at something and press use: buttons, terminals |
| hazards | Hazard | Damage zones (lava, acid): `dps` while inside |
| targets | Target | Shooting-range targets with scores and `onHit` signals |
| spawners | Spawner | Waves of prefabs on a timer or signal, with caps |
| ai | Brain | `melee`, `ranged`, and `turret` enemies: sight, hearing, chase via the nav grid, attack |

Their data (puppets, sounds, effects, prefabs like `grunt`, `gunner`, `turret`, `barrel`,
`health-small`, `key-red`, `door-blue`, `spawner`) lives in `engine/mechanics/data/` (pack `mechanics`).
Health events: `Damaged`, `Healed`, `Died`; use `applyDamage(ctx, target, amount, opts)` and
`heal()` rather than editing `Health.current`.

## HUD

Health, armor, ammo, crosshair, messages (`Message` events and signal-spec `message`), key
icons, damage flash, and the "click to play" hint. It hides while a camera override is active
(screenshots, the editor).
