import { describe, expect, test } from 'vitest';
import { ScriptedInput } from '../input/ScriptedInput.ts';
import { LevelPlugin } from '../level/LevelPlugin.ts';
import { readContentFiles } from '../node/readContentFiles.ts';
import { Body } from '../physics/Body.ts';
import { CharacterBody } from '../physics/CharacterBody.ts';
import { PhysicsPlugin } from '../physics/PhysicsPlugin.ts';
import { defineGame } from './defineGame.ts';
import { definePlugin } from './definePlugin.ts';
import { defineSystem } from './defineSystem.ts';
import { Engine } from './Engine.ts';
import { EngineError } from './EngineError.ts';
import { Transform } from './Transform.ts';

const walker = defineSystem({
  name: 'TestWalkerSystem',
  doc: 'Moves characters forward (-Z) while "forward" is held.',
  phase: 'update',
  run(ctx) {
    for (const e of ctx.world.query(CharacterBody, Transform)) {
      const v = ctx.input.down('forward') ? -4 : 0;
      ctx.physics.moveCharacter(e, { x: 0, y: -0.05, z: v * ctx.time.dt });
    }
  },
});

const game = defineGame({
  name: 'test-game',
  doc: 'In-memory test game',
  plugins: [PhysicsPlugin, LevelPlugin, definePlugin({ name: 'walker', doc: 'test', systems: [walker] })],
  startRoom: 'box',
  playerPrefab: 'walker',
});

const files = [
  ...readContentFiles(['engine']),
  {
    path: 'games/test-game/data/rooms/box.json',
    text: JSON.stringify({
      grid: { rows: ['#####', '#...#', '#.C.#', '#.P.#', '#####'], legend: { C: { prefab: 'crate' } } },
    }),
  },
  {
    path: 'games/test-game/data/prefabs/crate.json',
    text: JSON.stringify({ components: { Body: { type: 'dynamic', size: 1 } } }),
  },
  {
    path: 'games/test-game/data/prefabs/walker.json',
    text: JSON.stringify({ tags: ['player'], components: { CharacterBody: {} } }),
  },
];

async function boot(extra: { path: string; text: string }[] = []) {
  const input = new ScriptedInput();
  const engine = await Engine.create({ game, files: [...files, ...extra], input });
  return { engine, input };
}

describe('engine spine', () => {
  test('loads a grid room, merges walls, drops a crate, walks a character into a wall', async () => {
    const { engine, input } = await boot();
    expect(engine.content.errors()).toEqual([]);
    engine.loadRoom('box');
    const w = engine.world;
    const walls = w.tagged('wall');
    expect(walls.length).toBeLessThanOrEqual(4);
    const crate = w.named('crate@2,2')!;
    w.get(crate, Transform)!.pos.y = 2;
    for (let i = 0; i < 120; i++) engine.tick();
    expect(w.get(crate, Transform)!.pos.y).toBeCloseTo(0, 1);
    const player = w.named('player')!;
    const z0 = w.get(player, Transform)!.pos.z;
    input.hold('forward');
    for (let i = 0; i < 120; i++) engine.tick();
    const z1 = w.get(player, Transform)!.pos.z;
    expect(z1).toBeLessThan(z0 - 0.5);
    expect(z1).toBeGreaterThan(2);
    expect(w.get(player, CharacterBody)!.grounded).toBe(true);
    expect(w.has(crate, Body)).toBe(true);
  });

  test('unknown component names produce a teaching error with a suggestion', async () => {
    const { engine } = await boot([
      { path: 'games/test-game/data/prefabs/bad.json', text: '{ "components": { "Bdy": {} } }' },
    ]);
    const err = (() => {
      try {
        engine.spawn('bad');
      } catch (e) {
        return e as EngineError;
      }
    })();
    expect(err).toBeInstanceOf(EngineError);
    expect(err!.code).toBe('COMPONENT_UNKNOWN');
    expect(err!.message).toContain('Did you mean "Body"');
    expect(err!.where.file).toBe('games/test-game/data/prefabs/bad.json');
  });

  test('bad field values point at file, JSON path, and line', async () => {
    const text = '{\n  "components": {\n    "Body": { "type": "wobbly" }\n  }\n}';
    const { engine } = await boot([{ path: 'games/test-game/data/prefabs/bad2.json', text }]);
    expect(() => engine.spawn('bad2')).toThrow(/Allowed values: "static", "dynamic", "kinematic"/);
  });

  test('JSON syntax errors include line, column, and a fix', async () => {
    const { engine } = await boot([
      { path: 'games/test-game/data/prefabs/bad3.json', text: '{ "doc": "x", }' },
    ]);
    const [err] = engine.content.errors();
    expect(err!.code).toBe('JSON_SYNTAX');
    expect(err!.where.line).toBe(1);
    expect(err!.fix).toContain('Remove the comma');
  });
});
