import { describe, expect, test } from 'vitest';
import {
  applyDamage,
  Body,
  CharacterBody,
  CombatStats,
  type Ctx,
  Damaged,
  definePlugin,
  defineSystem,
  ElementState,
  Health,
  hp,
  Transform,
  Traversal,
  Weapon,
  weaponData,
} from '#engine/api.ts';
import { playtest } from '#engine/testing.ts';
import { applyBuild } from '../progression/applyBuild.ts';
import { RunKey } from '../RunState.ts';

async function scene() {
  let ctx!: Ctx;
  const plugin = definePlugin({
    name: 'test-context',
    doc: 'Expose a context for systemic combat tests.',
    systems: [
      defineSystem({
        name: 'TestContextSystem',
        doc: 'Expose a test context.',
        phase: 'update',
        run(c) {
          ctx = c;
        },
      }),
    ],
  });
  const t = await playtest('rift-runner', 'start', { plugins: [plugin] });
  t.tick();
  const dummy = (x: number) => {
    const e = t.engine.world.spawn({ tags: ['enemy'] });
    t.engine.world.add(e, Transform, { pos: [x, 0, 0] });
    t.engine.world.add(e, Health, { max: 1000 });
    return e;
  };
  return { t, ctx, dummy };
}

describe('shared elemental combat', () => {
  test('fire then frost produces a bounded thermal fracture on nearby opponents', async () => {
    const { t, ctx, dummy } = await scene();
    const a = dummy(0),
      b = dummy(2);
    const stats = t.get(t.player, CombatStats);
    stats.critical = 0;
    stats.element = 'fire';
    applyDamage(ctx, a, 100, { from: t.player, kind: 'bullet' });
    t.tick();
    expect(t.get(a, ElementState).burn).toBeGreaterThan(0);
    stats.element = 'frost';
    applyDamage(ctx, a, 100, { from: t.player, kind: 'bullet' });
    t.tick();
    expect(t.get(a, ElementState).burn).toBe(0);
    expect(hp(t.get(a, Health))).toBe(735);
    expect(hp(t.get(b, Health))).toBe(935);
    const before = t.events(Damaged).length;
    t.wait(0.25);
    expect(t.events(Damaged).length).toBe(before);
  });
  test('conductive targets chain shock without recursively multiplying procs', async () => {
    const { t, ctx, dummy } = await scene();
    const a = dummy(0),
      b = dummy(2),
      c = dummy(4);
    t.engine.world.add(a, ElementState, { wet: 2 });
    const stats = t.get(t.player, CombatStats);
    stats.critical = 0;
    stats.element = 'shock';
    stats.chains = 2;
    applyDamage(ctx, a, 100, { from: t.player, kind: 'bullet' });
    t.tick(5);
    expect(hp(t.get(b, Health))).toBe(945);
    expect(hp(t.get(c, Health))).toBe(945);
    expect(t.events(Damaged)).toHaveLength(3);
  });
  test('equipped weapon stats are instance data and do not mutate shared weapon definitions', async () => {
    const { t } = await scene();
    const s = t.engine.service(RunKey);
    s.profile.inventory[0]!.power = 3;
    applyBuild(t.engine);
    expect(t.get(t.player, Weapon).damage).toBe(57);
    expect(weaponData(t.engine.content, 'rift-weapons/carbine').damage).toBe(19);
  });
});

describe('action traversal', () => {
  test('air jumps are limited and dashes respect collision', async () => {
    const { t } = await scene();
    t.wait(0.2).press('jump').wait(0.18).press('jump');
    expect(t.get(t.player, Traversal).jumpsUsed).toBe(1);
    const speed = t.get(t.player, CharacterBody).velocity.y;
    t.wait(0.1).press('jump');
    expect(t.get(t.player, Traversal).jumpsUsed).toBe(1);
    expect(t.get(t.player, CharacterBody).velocity.y).toBeLessThan(speed);
    t.wait(1.2);
    const wall = t.engine.world.spawn();
    const pos = t.pos(t.player);
    t.engine.world.add(wall, Transform, { pos: [pos.x, 0, pos.z - 2] });
    t.engine.world.add(wall, Body, { size: [8, 5, 0.5] });
    t.tick(2).press('dash').wait(0.2);
    expect(t.pos(t.player).z).toBeGreaterThan(pos.z - 1.5);
    expect(t.get(t.player, Traversal).cooldown).toBeGreaterThan(0);
  });
  test('sliding lowers the collision capsule and cannot stand through a ceiling', async () => {
    const { t } = await scene();
    t.wait(0.2);
    t.input.hold('sprint');
    t.hold('moveForward', 0.45);
    t.press('crouch');
    t.input.hold('crouch');
    expect(t.get(t.player, Traversal).sliding).toBeGreaterThan(0);
    expect(t.get(t.player, CharacterBody).height).toBe(1.05);
    t.release('moveForward').release('sprint');
    const roof = t.engine.world.spawn();
    const pos = t.pos(t.player);
    t.engine.world.add(roof, Transform, { pos: [pos.x, 1.35, pos.z] });
    t.engine.world.add(roof, Body, { size: [8, 0.2, 8] });
    t.tick(2).release('crouch').tick(2);
    expect(t.get(t.player, CharacterBody).height).toBe(1.05);
  });

  test('a second jump at a clear ledge mantles it even after air jumps are exhausted', async () => {
    const { t } = await scene();
    t.get(t.player, Traversal).airJumps = 0;
    const ledge = t.engine.world.spawn();
    t.engine.world.add(ledge, Transform, { pos: [0, 0, 10] });
    t.engine.world.add(ledge, Body, { size: [6, 2.8, 8] });
    t.wait(0.2).hold('moveForward', 0.3);
    t.input.hold('moveForward');
    t.press('jump').wait(0.25).press('jump').wait(0.7);
    expect(t.pos(t.player).y, t.pos(t.player).toArray().join(',')).toBeGreaterThan(2.8);
    expect(t.pos(t.player).z).toBeLessThan(14);
    expect(t.get(t.player, Traversal).jumpsUsed).toBe(0);
  });
});
