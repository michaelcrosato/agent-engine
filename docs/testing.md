# Testing: rooms are tests

Every room has `<room>.test.ts` next to its JSON, and `npm run check` runs them all headlessly
(no browser, no GPU) in a few seconds. A test drives the game the way a player does: it holds
input actions, looks around, walks with a bot, and checks gameplay state.

```ts
import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { Door } from '#engine/api.ts';
import { playtest } from '#engine/testing.ts';

describe('doors & keys', () => {
  test('the button opens the first door', async () => {
    const t = await playtest('fps-demo', 'keys');
    expect(t.walkTo(new Vector3(10.6, 0, 4.5))).toBe(true);
    t.lookAt('button-1', 0.35);
    t.press('use');
    t.wait(1);
    expect(t.get('door-1', Door).open).toBe(true);
  });
});
```

## playtest(game, room?, options)

Boots the game from disk and loads the room (default: the start room). Options: `seed`,
`tuning` (preset ids), `spawn`, `files` (inject or replace data files: `{ path, text }`),
`plugins` (test a mechanic before registering it in the game). A system that throws fails the
test with its teaching error.

## The Playtest API

| Call | Does |
| --- | --- |
| `tick(n)`, `wait(seconds)`, `until(pred, timeout)` | Advance fixed ticks (60 per second) |
| `hold(action, seconds?)`, `release(action)`, `press(action)` | Input actions from the input map: `moveForward`, `jump`, `fire`, `use`, ... |
| `look(dx, dy)`, `lookAt(target, height?)` | Turn the player; targets are names, entities, or points |
| `walkTo(target, { timeout, radius })` | Bot walk along the nav grid (jumps when stuck); true on arrival or when the room changes |
| `get(name, Component)`, `pos(name)`, `player`, `entity(name)`, `exists(name)` | Read state |
| `set(name, 'Component', 'field', value)`, `signal(target, action)` | Poke state, send a level signal |
| `events('Message')`, `eventCounts()`, `sounds('pickup')` | Everything that happened, recorded |
| `capture(label)` | Writes a snapshot to `out/captures/<game>/<room>/<label>.json` |
| `t.engine` | The whole engine (world, physics, content, audio recorder) |

Tips:

- After `press('use')` or `signal(...)`, `t.tick()` once before asserting effects: signals sent
  after a receiver ran reach it next tick.
- Aim at the centre of thin things: `lookAt('button-1', 0.35)` (height above the origin).
- Teleport to skip travel: `t.engine.physics.teleport(t.player, new Vector3(x, y, z))`.
- Tests are deterministic for a given seed. Rendering and clip sampling do not run headless.

## Scripted steps (CLI and MCP)

The same vocabulary as JSON, for exploring without writing a test:

```sh
npm run play -- fps-demo/range --steps '[{"lookAt":"target-1"},{"press":"fire"},{"wait":0.5}]'
npm run play -- fps-demo/keys --steps '[{"walkTo":"key-red"},{"capture":"got-key"}]'
```

Steps: `wait`, `hold` + `seconds`, `press`, `look: [dx, dy]`, `lookAt`, `walkTo` (+ `timeout`),
`untilEvent`, `signal: [target, action]`, `teleport: [x, y, z]`,
`set: [entity, Component, field, value]`, `capture`. The report lists events, the player's
state, and the capture file. Screenshots accept the same steps: `npm run shot -- <game>/<room> --steps '[...]'`.

## Mechanic tests

`npm run new -- mechanic <name>` writes a test that injects a prefab with `files` and the
plugin with `plugins`, spawns it, waits, and checks the component. Keep that shape: data in,
ticks, assert state.
