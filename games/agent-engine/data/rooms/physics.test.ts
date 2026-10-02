import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { playtest } from '#engine/testing.ts';

describe('physics playground', () => {
  test('the crate pyramid settles and stays standing', async () => {
    const t = await playtest('agent-engine', 'physics');
    t.wait(2);
    expect(t.pos('pyr-6').y).toBeCloseTo(2, 1);
    expect(t.pos('pyr-1').y).toBeCloseTo(0, 1);
  });

  test('shooting one barrel chains into the others and scatters the pyramid', async () => {
    const t = await playtest('agent-engine', 'physics');
    t.wait(0.5);
    const top = t.pos('pyr-6');
    t.lookAt('barrel-a', 0.6);
    t.press('fire');
    t.wait(0.3);
    t.press('fire');
    expect(t.until(() => t.events('Exploded').length >= 3, 3)).toBe(true);
    t.wait(1);
    expect(t.pos('pyr-6').distanceTo(top)).toBeGreaterThan(0.5);
  });

  test('walking into a crate pushes it', async () => {
    const t = await playtest('agent-engine', 'physics');
    t.wait(0.5);
    const before = t.pos('wall-2');
    t.engine.physics.teleport(t.player, new Vector3(14.05, 0.05, 16));
    t.tick();
    t.lookAt(new Vector3(14.05, 1.6, 0));
    t.hold('moveForward', 1.5);
    expect(t.pos('wall-2').z).toBeLessThan(before.z - 0.2);
  });

  test('balls roll down the ramp', async () => {
    const t = await playtest('agent-engine', 'physics');
    const z0 = t.pos('ball-1').z;
    t.wait(3);
    expect(t.pos('ball-1').z).toBeGreaterThan(z0 + 1);
  });

  test('the kinematic pusher shoves crates in its path', async () => {
    const t = await playtest('agent-engine', 'physics');
    const before = t.pos('swept-1');
    t.wait(5);
    expect(t.pos('swept-1').distanceTo(before)).toBeGreaterThan(1);
  });
});
