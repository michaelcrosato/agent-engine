# Level logic: signals, triggers, counters, timers

Level logic is wired in room JSON with **signal specs**. A spec can send a signal, show a
message, play a sound, switch music or the look, after an optional delay:

```json
{ "target": "door-1", "action": "open", "value": 0, "delay": 0.5,
  "message": "The door opens", "sound": "door-open", "music": "tense", "look": "night" }
```

- `target` is an entity `name` or `"#tag"` for every entity with that tag. Empty = no signal.
- `music: "none"` stops the music.
- The same spec list appears as `Trigger.onEnter/onExit`, `Interactable.onUse`,
  `Counter.onReach`, `Timer.onFire`, `Health.onDeath`, and `Target.onHit`.
- `npm run tool -- validate <game>` reports targets that do not exist in the room.

## Who understands which action

| Receiver | Actions |
| --- | --- |
| Door | `open`, `close`, `toggle`, `unlock`, `lock` |
| Mover (lifts, platforms) | `start`, `stop`, `toggle`, `open`/`forward`, `close`/`back` |
| Animator | `play:<role or clip>` (e.g. `play:walk`) |
| Counter | `add` (by `value`, default 1), `reset` |
| Timer | `start`, `stop` |
| RoomExit | `unlock`, `lock` |
| Spawner | `start`, `stop`, `spawn` |
| Light, AmbientSound | `on`, `off`, `toggle` (see the power switch in the audio room) |

Check a component's doc for its exact actions: `npm run tool -- describe Spawner`.

## Building blocks (prefabs)

- `trigger`: an invisible sensor box. `Trigger.filter` is a tag (`player` by default) or `any`;
  `once` fires only the first time.
- `button`: a wall button the player uses (E). Set `Interactable.onUse`.
- `door`, `door-red/blue/yellow` (need a key), `door-locked` (opened by a signal).
- `platform-moving`: a Mover between points; riders are carried.
- `exit`: a RoomExit pad. `spawner`: spawns prefabs in waves.
- Counters and timers are components; add them to any entity with `with`.

## Example: three kills open the exit

```json
{ "prefab": "sign", "name": "kills", "with": { "Counter": { "goal": 3,
    "onReach": [{ "target": "exit-hub", "action": "unlock", "message": "The exit is open" }] } } },
{ "prefab": "grunt", "with": { "Health": { "onDeath": [{ "target": "kills", "action": "add" }] } } },
{ "prefab": "exit", "name": "exit-hub", "with": { "RoomExit": { "room": "hub", "locked": true } } }
```

## From code

`sendSignal(ctx, 'door-1', 'open')`, `runSignalSpec(ctx, spec, fromEntity)`. React to signals
in a system with `for (const s of ctx.events.read(Signal))` and check `s.target`/`s.action`.
A signal sent after its receiver ran this tick arrives next tick (tests: `t.tick()` once).
