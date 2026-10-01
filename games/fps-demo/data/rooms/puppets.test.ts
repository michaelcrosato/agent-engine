import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { Animator } from '#engine/api.ts';
import { playtest } from '#engine/testing.ts';

const EXHIBITS = ['show-grunt', 'show-gunner', 'show-turret', 'show-critter', 'show-windmill', 'show-jelly'];

describe('puppet gallery', () => {
  test('a console button switches every exhibit to that animation role', async () => {
    const t = await playtest('fps-demo', 'puppets');
    expect(t.walkTo(new Vector3(17, 0, 19.4))).toBe(true);
    t.lookAt('anim-walk', 0.35);
    t.press('use');
    t.tick(); // signals reach receivers that already ran this tick on the next tick
    for (const name of EXHIBITS) expect(t.get(name, Animator).play, name).toBe('walk');
  });

  test('every exhibit is tagged "display" so one signal reaches all of them', async () => {
    const t = await playtest('fps-demo', 'puppets');
    const tagged = t.engine.world.tagged('display').map((e) => t.engine.world.nameOf(e));
    expect(tagged.sort()).toEqual([...EXHIBITS].sort());
  });
});
