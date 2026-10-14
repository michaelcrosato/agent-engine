import { Vector3 } from 'three';
import { expect, test } from 'vitest';
import { Animator } from '#engine/api.ts';
import { playtest } from '#engine/testing.ts';
import { RunKey } from '../../RunState.ts';

// Every room is a test: load it headlessly, play it through input actions, assert outcomes.
test('rift-runner/start loads and the player can move', async () => {
  const t = await playtest('rift-runner', 'start');
  const start = t.pos('player');
  t.hold('moveForward', 1);
  expect(t.pos('player').distanceTo(start)).toBeGreaterThan(1);
  t.capture('after-walk');
});

test('the three animated town characters open their services, and the physical gate deploys', async () => {
  const t = await playtest('rift-runner', 'start');
  const s = t.engine.service(RunKey);
  expect(t.engine.world.tagged('town-npc')).toHaveLength(3);
  for (const id of ['forge', 'vendor', 'guide'] as const) {
    const at = t.pos(id).add(new Vector3(0, 0, 2));
    t.engine.physics.teleport(t.player, at);
    t.tick(2).press('use');
    expect(s.panel).toBe(id);
    expect(t.get(id, Animator).play).toMatch(/^runner-/);
    s.panel = '';
  }
  t.engine.physics.teleport(t.player, new Vector3(0, 0.3, -8));
  t.tick(2).press('use').tick();
  expect(t.engine.roomId).toBe('expedition');
  expect(s.phase).toBe('combat');
});
