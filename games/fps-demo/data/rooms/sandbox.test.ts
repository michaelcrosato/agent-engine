import { expect, test } from 'vitest';
import { Arsenal, Inventory } from '#engine/api.ts';
import { playtest } from '#engine/testing.ts';

test('sandbox: walking onto the shotgun gives the weapon and its shells', async () => {
  const t = await playtest('fps-demo', 'sandbox');
  expect(t.walkTo('pickup-shotgun@10,7')).toBe(true);
  t.wait(0.2);
  const arsenal = t.get('player', Arsenal);
  expect(arsenal.weapons).toContain('weapons/shotgun');
  expect(arsenal.weapons[arsenal.current]).toBe('weapons/shotgun');
  expect(t.get('player', Inventory).ammo.shells).toBe(12);
  expect(t.exists('pickup-shotgun@10,7')).toBe(false);
});

test('sandbox: falling into the pit kills the player and the room restarts', async () => {
  const t = await playtest('fps-demo', 'sandbox');
  expect(t.walkTo('pickup-shotgun@10,7')).toBe(true);
  t.engine.physics.teleport(t.player, t.pos('player').set(13, 1, 13));
  expect(t.until(() => t.events('Died').length > 0, 5)).toBe(true);
  expect(t.until(() => t.events('RoomLoaded').length > 0, 5)).toBe(true);
  expect(t.pos('player').y).toBeGreaterThan(-1);
});
