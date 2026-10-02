# Level editor, debug overlay, hot reload

All three run on the dev server: `npm run dev`, then open a room.

## Level editor

Open with `?game=agent-engine&room=arena&edit=1`, or press **F2** in any room. The game pauses and
a free camera takes over. The editor edits the room file itself (`games/<g>/data/rooms/<id>.json`):
every change is re-validated and the room is rebuilt, so what you see is what the file says.

| Do | How |
| --- | --- |
| Fly | Hold the right mouse button + WASD (Q/E down/up, Shift faster); wheel dollies; middle-drag pans |
| Overview / top view | T for straight down (best for painting); F focuses the selection |
| Select | Click a model, label, or marker (diamonds mark invisible entities; outlines show sensors) |
| Move | Drag the gizmo arrows (snaps to 0.25 m; `cell` placements snap to cells) |
| Turn | R / Shift+R: ±15° yaw |
| Edit fields | Inspector (right): name, prefab, position, rotation, tags, and every component field. Changed fields become `with` overrides (yellow, ↺ resets). "+ add component" adds one |
| Place | Pick a prefab in the palette (filterable), click in the room |
| Paint the grid | Pick a glyph (B), click or drag over cells |
| Delete / duplicate | Del / Ctrl+D |
| Undo / redo | Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) |
| Save | Ctrl+S: writes the file through the dev server, formatted the way `npm run check` expects |
| Play | F2 plays the room as edited from its spawn; Shift+F2 from below the camera; F2 again returns |
| Other rooms | The room picker (top left); unsaved edits are kept per room |

Entities placed by grid glyphs and the level geometry are edited by painting cells. The player
comes from the game's `playerPrefab`; move a spawn point instead.

If the file changes on disk while the editor is open (an agent edits it), a clean editor
reloads it; with unsaved edits it keeps yours and says so (saving overwrites the file).

## Debug overlay

`?debug=1`, or the `debug` input action (Backquote). Shows the room, tick, FPS, entity and body
counts, draw calls and triangles per frame, the look and song, the slowest systems (ms, smoothed),
and the entity under the crosshair with all its components. Shift+Backquote draws physics
colliders as wireframes.

## Hot reload

Saving any data file (from the editor, an agent, or a text editor) applies it without a page
reload. Rooms, prefabs, puppets, and tuning rebuild the room with the player kept in place;
looks, post stacks, and textures re-skin; sounds re-synthesize and play once; songs restart.
Invalid data shows a teaching error in the red panel and leaves the last good version running.
