import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { Door, Inventory, Mover } from '#engine/api.ts';
import { playtest } from '#engine/testing.ts';

const messages = (t: Awaited<ReturnType<typeof playtest>>) =>
  t.events<{ text: string }>('Message').map((m) => m.text);

describe('doors & keys', () => {
  test('the red door refuses a player without the red key', async () => {
    const t = await playtest('agent-engine', 'keys');
    t.engine.physics.teleport(t.player, new Vector3(22.5, 0.05, 7));
    t.wait(0.5);
    expect(messages(t)).toContain('Locked. Needs the red key.');
    expect(t.get('door-red', Door).open).toBe(false);
  });

  test('the whole puzzle: button, red key, lift button, blue key, blue door, exit', async () => {
    const t = await playtest('agent-engine', 'keys');
    expect(t.walkTo(new Vector3(10.6, 0, 4.5))).toBe(true);
    t.lookAt('button-1', 0.35);
    t.press('use');
    t.wait(1);
    expect(t.get('door-1', Door).open).toBe(true);
    expect(messages(t)).toContain('Door unlocked');

    expect(t.walkTo('key-red')).toBe(true);
    t.wait(0.2);
    expect(t.get('player', Inventory).keys).toContain('red');

    expect(t.walkTo(new Vector3(27, 0, 9))).toBe(true);
    t.lookAt('button-2', 0.35);
    t.press('use');
    t.tick(); // signals reach receivers that already ran this tick on the next tick
    expect(t.get('lift', Mover).active).toBe(true);

    t.engine.physics.teleport(t.player, t.pos('lift').add(new Vector3(0, 0.5, 0)));
    expect(t.until(() => t.pos('player').y > 3.8, 6)).toBe(true);
    t.lookAt(new Vector3(40, 5.6, 5));
    t.hold('moveForward', 1);
    expect(t.get('player', Inventory).keys).toContain('blue');

    t.engine.physics.teleport(t.player, new Vector3(29, 0.05, 11));
    expect(t.walkTo(new Vector3(31, 0, 15))).toBe(true);
    expect(t.get('door-blue', Door).open).toBe(true);
    expect(messages(t)).toContain('Puzzle solved!');
    expect(t.walkTo('exit-hub', { timeout: 5 })).toBe(true);
    t.wait(0.2);
    expect(t.engine.roomId).toBe('hub');
  });
});
