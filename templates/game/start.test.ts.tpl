import { expect, test } from 'vitest';
import { playtest } from '#engine/testing.ts';

// Every room is a test: load it headlessly, play it through input actions, assert outcomes.
test('__name__/start loads and the player can move', async () => {
  const t = await playtest('__name__', 'start');
  const start = t.pos('player');
  t.hold('moveForward', 1);
  expect(t.pos('player').distanceTo(start)).toBeGreaterThan(1);
  t.capture('after-walk');
});
