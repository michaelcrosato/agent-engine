# Components, systems, plugins, games

The engine is a small ECS. Entities are numbers; components are plain data; systems are
functions over queries. Game code imports everything from `#engine/api.ts`.

## Components

```ts
import { defineComponent, field } from '#engine/api.ts';

/** Floats an entity up and down. */
export const Bob = defineComponent({
  name: 'Bob',
  doc: 'Moves the entity up and down around its start height.',
  schema: {
    height: field.number(0.5, { min: 0, unit: 'm', doc: 'Peak offset' }),
    speed: field.number(1, { min: 0, unit: 'Hz' }),
    baseY: field.number(Number.NaN, { doc: 'State: start height' }),
  },
});
```

- Field helpers: `number`, `int`, `bool`, `string`, `enum`, `vec3` (`[x,y,z]` in JSON, `Vector3`
  at runtime), `vec2`, `rot` (yaw or Euler degrees in JSON, `Quaternion` at runtime), `color`,
  `ref(kind)` (a content id, checked by validation), `entity` (an entity name), `list`, `object`.
- The schema gives defaults, validation with JSON paths, TypeScript types, the editor inspector,
  JSON Schemas, and [reference docs](reference/components.md), all from one declaration.
- Start a doc with `State` for runtime-only fields; the editor hides them.
- Scaffold: `npm run new -- component Bob --mechanic bob`.

## Systems and phases

```ts
export const BobSystem = defineSystem({
  name: 'BobSystem',
  doc: 'Applies Bob offsets.',
  phase: 'update',
  run(ctx) {
    for (const e of ctx.world.query(Bob, Transform)) {
      const b = ctx.world.get(e, Bob)!;
      const t = ctx.world.get(e, Transform)!;
      if (Number.isNaN(b.baseY)) b.baseY = t.pos.y;
      t.pos.y = b.baseY + Math.sin(ctx.time.elapsed * b.speed * Math.PI * 2) * b.height;
    }
  },
});
```

- Each fixed tick (1/60 s) runs `input → update → physics → late`, in Node and in the browser.
  The browser also runs `frame` once per rendered frame (rendering, animation sampling, HUD).
- `order` sorts systems within a phase (lower first; default 0; ties keep plugin order).
- `ctx` holds everything a system may use: `world`, `time` (`dt`, `elapsed`, `tick`), `events`,
  `rng` (seeded), `content`, `input`, `physics`, `audio`, `log`, `spawn()`, `service()`.
- A system that throws fails the test with a teaching error (headless). In the browser it is
  disabled and its error shows in the red panel.

## World

`world.spawn/destroy` (destroy is deferred to the end of the tick), `add/get/need/has/remove`,
`query(A, B)`, `named('door-1')`, `tag/hasTag/tagged('enemy')`, `label(e)` for messages,
`prefabOf(e)`, `sourceOf(e)` (where in the room file it came from).

## Events

```ts
export const Bounced = defineEvent<{ entity: Entity; height: number }>('Bounced', 'An entity bounced.');
ctx.events.emit(Bounced, { entity: e, height: 2 });
for (const b of ctx.events.read(Bounced)) { ... }   // each system sees each event once
```

An event emitted after a reader ran this tick reaches it on the next tick.

## Services

Plugin-owned singletons with typed keys, for state that is not per-entity:

```ts
export const ScoreKey = defineService<{ points: number }>('score', 'Points this run.');
// plugin setup: engine.provide(ScoreKey, { points: 0 });   system: ctx.service(ScoreKey).points++
```

## Plugins and games

```ts
export const BobPlugin = definePlugin({
  name: 'bob',
  doc: 'Bobbing props.',
  components: [Bob],
  systems: [BobSystem],
  events: [Bounced],
  // contentKinds, requires, data (a data pack), setup, roomLoad, roomReady, roomUnload
});

export const game = defineGame({
  name: 'my-game',
  doc: 'One line.',
  plugins: [...fpsKit(), BobPlugin],
  startRoom: 'start',
  playerPrefab: 'player',
});
```

`npm run new -- mechanic bob` creates the component, system, plugin, and a test.
List what a game has: `npm run tool -- list components|systems|plugins|events`.
