import { expect, test } from 'vitest';
import { playtest } from '#engine/testing.ts';
import { __Comp__ } from './__Comp__.ts';
import { __Comp__Plugin } from './__Comp__Plugin.ts';

test('__Comp__ updates its state every tick', async () => {
  const prefab = { path: 'games/__game__/data/prefabs/test-__name__.json', text: JSON.stringify({ components: { __Comp__: {} } }) };
  const t = await playtest('__game__', undefined, { files: [prefab], plugins: [__Comp__Plugin] });
  const e = t.engine.spawn('test-__name__', { pos: [0, 1, 0] });
  t.wait(1);
  expect(t.engine.world.get(e, __Comp__)!.timer).toBeGreaterThan(0.9);
});
