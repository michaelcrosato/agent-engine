import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { playtest } from '#engine/testing.ts';

describe('looks gallery', () => {
  test('pressing a look button switches the look', async () => {
    const t = await playtest('fps-demo', 'looks');
    expect(t.walkTo(new Vector3(13, 0, 18))).toBe(true);
    t.lookAt('look-neon', 0.35);
    t.press('use');
    expect(t.events<{ look: string }>('LookChanged').map((e) => e.look)).toEqual(['neon']);
  });

  test('every swatch uses a material the default look defines', async () => {
    const t = await playtest('fps-demo', 'looks');
    const swatches = t.engine.world.entities().filter((e) => t.engine.world.nameOf(e)?.startsWith('swatch-'));
    expect(swatches).toHaveLength(18);
  });
});
