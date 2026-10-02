import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { playtest } from '#engine/testing.ts';

describe('movement course', () => {
  test('the stairs climb 0.5 m per cell up to the 3 m walkway', async () => {
    const t = await playtest('agent-engine', 'movement');
    expect(t.walkTo(new Vector3(3, 3, 3))).toBe(true);
    expect(t.pos('player').y).toBeCloseTo(3, 0);
  });

  test('a running jump clears the gap, a second jump climbs the 1 m ledge, the goal says so', async () => {
    const t = await playtest('agent-engine', 'movement');
    t.engine.physics.teleport(t.player, new Vector3(11, 3.05, 3));
    t.tick();
    t.lookAt(new Vector3(40, 4.6, 3));
    t.hold('moveForward');
    expect(t.until(() => t.pos('player').x > 13.4, 3)).toBe(true);
    t.press('jump');
    expect(t.until(() => t.pos('player').x > 18.6, 3)).toBe(true);
    expect(t.pos('player').y).toBeGreaterThan(2.9);
    t.press('jump');
    expect(t.until(() => t.pos('player').x > 28, 4)).toBe(true);
    t.release('moveForward');
    expect(t.pos('player').y).toBeCloseTo(4, 0);
    expect(t.events<{ text: string }>('Message').map((m) => m.text)).toContain('Course complete!');
  });

  test('the elevator carries a standing player up to the deck', async () => {
    const t = await playtest('agent-engine', 'movement');
    t.engine.physics.teleport(t.player, new Vector3(25, 0.5, 11));
    expect(t.until(() => t.pos('player').y > 3.9, 8)).toBe(true);
    t.lookAt(new Vector3(25, 5.6, 0));
    t.hold('moveForward', 0.8);
    expect(t.pos('player').z).toBeLessThan(10);
    expect(t.pos('player').y).toBeCloseTo(4, 0);
  });

  test('the "floaty" tuning preset roughly doubles jump height', async () => {
    const peak = async (tuning: string[]) => {
      const t = await playtest('agent-engine', 'movement', { tuning });
      t.engine.physics.teleport(t.player, new Vector3(5, 0.05, 19));
      t.wait(0.3);
      const ground = t.pos('player').y;
      t.press('jump');
      let top = ground;
      for (let i = 0; i < 90; i++) top = Math.max(top, t.tick().pos('player').y);
      return top - ground;
    };
    const normal = await peak([]);
    const floaty = await peak(['floaty']);
    expect(normal).toBeCloseTo(7.2 ** 2 / (2 * 22), 0);
    expect(floaty / normal).toBeGreaterThan(1.8);
  });

  test('the ramp leads onto the 1 m block', async () => {
    const t = await playtest('agent-engine', 'movement');
    t.engine.physics.teleport(t.player, new Vector3(11, 0.05, 19.5));
    t.tick();
    t.lookAt(new Vector3(11, 2.6, 0));
    t.hold('moveForward', 1.2);
    expect(t.pos('player').y).toBeCloseTo(1, 0);
    t.capture('on-block');
  });
});
