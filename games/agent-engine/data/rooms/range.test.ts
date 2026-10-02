import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { Arsenal, Inventory, Target, weaponData } from '#engine/api.ts';
import { playtest } from '#engine/testing.ts';

describe('shooting range', () => {
  test('a pistol shot knocks a target down for 10 points and it pops back up', async () => {
    const t = await playtest('agent-engine', 'range');
    t.lookAt('target-1', 1.45);
    t.press('fire');
    t.wait(0.1);
    const scored = t.events<{ points: number }>('Scored');
    expect(scored).toHaveLength(1);
    expect(scored[0]!.points).toBe(10);
    expect(t.get('target-1', Target).down).toBe(true);
    t.wait(3);
    expect(t.get('target-1', Target).down).toBe(false);
  });

  test('the rifle fires automatically while held, empties its magazine, and reloads from reserve', async () => {
    const t = await playtest('agent-engine', 'range');
    expect(t.walkTo('pickup-rifle')).toBe(true);
    t.wait(0.4);
    const a = t.get('player', Arsenal);
    expect(a.weapons[a.current]).toBe('weapons/rifle');
    const reserve = t.get('player', Inventory).ammo.bullets!;
    t.lookAt(new Vector3(14, 1.5, 2));
    t.hold('fire', 3.8);
    expect(a.shots).toBeGreaterThanOrEqual(30);
    t.wait(2);
    expect(a.mags['weapons/rifle']).toBe(weaponData(t.engine.content, 'weapons/rifle').magazine);
    expect(t.get('player', Inventory).ammo.bullets).toBeLessThan(reserve);
  });

  test('a rocket into the barrels sets off a chain of explosions', async () => {
    const t = await playtest('agent-engine', 'range');
    expect(t.walkTo('pickup-launcher')).toBe(true);
    t.wait(0.4);
    t.lookAt('barrel@6,1', 0.6);
    t.press('fire');
    expect(t.until(() => t.events('Exploded').length >= 3, 4)).toBe(true);
    expect(t.exists('barrel@6,1')).toBe(false);
    expect(t.exists('barrel@7,1')).toBe(false);
  });
});
