import { describe, expect, test } from 'vitest';
import { Arsenal, Brain, Counter, Health, Inventory } from '#engine/api.ts';
import { type NodePlaytest, playtest } from '#engine/testing.ts';

/** Nearest living wave enemy (spawned robots, not the tower turret), or undefined. */
function nearestEnemy(t: NodePlaytest): number | undefined {
  const w = t.engine.world;
  const me = t.pos('player');
  let best: number | undefined;
  let bestD = Infinity;
  for (const e of w.query(Brain, Health)) {
    if (w.get(e, Health)!.dead || w.nameOf(e) === 'tower-turret') continue;
    const d = t.pos(e).distanceTo(me);
    if (d < bestD) [best, bestD] = [e, d];
  }
  return best;
}

describe('arena', () => {
  test('stepping in starts the waves; destroying 10 robots clears the arena and spawns a reward', async () => {
    const t = await playtest('fps-demo', 'arena');
    t.get('player', Health).invulnerable = true;
    t.get('player', Inventory).ammo.bullets = 999;
    t.get('player', Arsenal).weapons.push('weapons/rifle');
    t.press('weapon4');
    expect(t.walkTo('arena-start')).toBe(true);
    expect(t.events<{ text: string }>('Message').some((m) => m.text.startsWith('Wave incoming'))).toBe(true);
    const counter = t.get('kills', Counter);
    const end = t.seconds + 90;
    while (!counter.done && t.seconds < end) {
      const enemy = nearestEnemy(t);
      if (enemy === undefined) {
        t.wait(0.25);
        continue;
      }
      t.lookAt(enemy, 1.1);
      t.hold('fire', 0.25);
    }
    t.release('fire');
    expect(counter.count).toBeGreaterThanOrEqual(10);
    expect(t.events<{ text: string }>('Message').some((m) => m.text.startsWith('Arena cleared'))).toBe(true);
    t.wait(0.5);
    expect(t.engine.world.tagged('pickup').length).toBeGreaterThan(0);
    expect(t.engine.audio.currentMusic).toBe('calm');
    t.capture('cleared');
  });

  test('robots hunt down and hurt a player who does not fight back', async () => {
    const t = await playtest('fps-demo', 'arena');
    expect(t.walkTo('arena-start')).toBe(true);
    expect(
      t.until(() => t.events<{ entity: number }>('Damaged').some((d) => d.entity === t.player), 20),
    ).toBe(true);
  });
});
