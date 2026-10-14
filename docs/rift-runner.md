# Rift Runner

The engine's playable single-player signature game. Keep moving, clear a rift, gather gear,
change your build in Lastlight, then push to the next depth. There is no story campaign.
Every model, animation, texture, effect and sound is generated from source data.

## Play

`npm install && npm run dev`, then open the printed local URL. The root page launches Rift Runner.
`?game=rift-runner&room=expedition` jumps into the current expedition; `?launcher=1` opens the
original engine-room gallery. Both games remain independent users of the public engine API.

| Control | Action |
| --- | --- |
| WASD / left stick | Move |
| Mouse / right stick | Look |
| Left mouse / right trigger | Fire; every weapon supports hold-to-fire |
| Right mouse / left trigger | Focus aim |
| Shift / left-stick press | Sprint |
| Space / A | Jump, then one air jump; mantle low ledges |
| C or Ctrl / B | Crouch; press while moving fast to slide |
| Q / left bumper | Directional dash |
| F / right bumper | Frost nova |
| G / Y | Ember charge at the aim point |
| E / X | Use a gate or nearby town service |
| R | Reload; reserves are unlimited |
| V | Switch third/first person |
| I or Tab / K | Equipment / skill constellation |
| Escape / Start | Pause and menus |

Menus pause simulation. Mouse capture is released for menus, defeat and the clear screen.
Keyboard and mouse provide full menu navigation; a gamepad controls combat and pause.

## Build and progression

- XP awards levels and skill points. Begin with two points to experiment immediately.
- 24 prerequisite-linked nodes in Vanguard, Tempest and Catalyst provide 66 ranks.
- At level 25, repeatable Force, Survival and Flow mastery provide continued point sinks.
- Four firearms, three equipment slots, five rarities, four elements and twelve affix types.
  Legendary gear also gains an on-kill explosion. Weapon rolls never modify shared assets.
- Gold and equipment drop into the world, with color-coded beams and proximity collection.
  A full 40-slot pack salvages extra finds; equipped items cannot be accidentally salvaged.
- Brass tempers weapons up to five times. Vel sells rare-or-better mystery gear. Ion refunds
  skill and mastery points for free. All three provide free healing in town.
- Death retains earned XP, gold, skills and equipment. Retry the same depth or return to town.
- Clearing a rift heals the runner and grants gold plus guaranteed rare-or-better equipment.
  Every third depth ends with a boss and an epic-or-better clear reward.

All six damage/health/speed sliders affect player and enemies independently. Health changes
preserve the fraction remaining. Existing enemies update immediately. Standard is challenging;
Explore and Relentless are shortcuts to combinations of the same visible sliders.

## Visual filters

Cel shading is the default: banded lighting, ink silhouettes and geometric edge lines.
Open **Settings → Art direction** to preview Cel shaded, Graphic novel (warm print and
halftone), Vivid (richer color), or Original (filter off). Apply any filter to the entire
scene, only the environment, or only characters and objects. Restore cel shaded default
returns to Cel shaded / Entire scene.

Environment includes terrain, buildings, sky and vegetation. Characters and objects includes
the runner, first-person weapon, NPCs, monsters, gear, crates, lamps and interactive props.
Menus and combat HUD stay crisp. Settings update immediately while paused, persist across
room/palette changes and reloads, and also work with existing saves.

## Persistence

Versioned localStorage saves use `agent-engine:rift-runner:v1`, with a last-valid backup.
Profile schemas validate the envelope and payload; unavailable storage permits session-only play
and displays its status. Save after purchases, skills, room changes, defeat and clears, and at
five-second intervals after ordinary rewards. Settings save on slider release.

The save belongs to the browser origin, not a cloud account. Reload returns to the safe hub;
gear and the next uncleared depth persist, while an unfinished encounter restarts. Screenshot
mode and headless tests never read or write browser saves. `&seed=7` seeds a fresh profile;
a saved profile retains its seed so its expeditions remain reproducible.

## Verify

- `npm run check`: types, formatting, architecture, all content, generated schemas and headless tests.
- `npm run build`: production bundle.
- `npm run shot -- rift-runner/start --views player,top`
- `npm run shot -- rift-runner/expedition --frames 540 --views player,top`
- `npm test -- games/rift-runner`: progression, traversal, reactions, complete combat loops and scaling.

See [endless-content](endless-content.md) for the authoring vocabulary and
[engine-review](engine-review.md) for the engine changes behind the game.
