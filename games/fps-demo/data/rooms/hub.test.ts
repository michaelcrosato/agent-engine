import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { type Entity, RoomExit } from '#engine/api.ts';
import { playtest } from '#engine/testing.ts';

describe('hub', () => {
  test('a bot walks from the spawn onto the Movement pad and arrives in that room', async () => {
    const t = await playtest('fps-demo', 'hub');
    expect(t.walkTo('exit-movement')).toBe(true);
    expect(t.engine.roomId).toBe('movement');
  });

  test('every pad leads to its room, whose exit returns the player beside the same pad', async () => {
    const t = await playtest('fps-demo', 'hub');
    const world = () => t.engine.world;
    const standOn = (target: string | Entity) =>
      t.engine.physics.teleport(t.player, t.pos(target).add(new Vector3(0, 0.1, 0)));
    const pads = world()
      .query(RoomExit)
      .map((e) => world().nameOf(e)!);
    expect(pads).toHaveLength(8);
    for (const pad of pads) {
      const room = t.get(pad, RoomExit).room;
      standOn(pad);
      expect(
        t.until(() => t.engine.roomId === room, 2),
        `${pad} loads "${room}"`,
      ).toBe(true);
      const back = world()
        .query(RoomExit)
        .find((e) => world().get(e, RoomExit)!.room === 'hub');
      expect(back, `room "${room}" has an exit back to the hub`).toBeDefined();
      expect(t.get(back!, RoomExit).spawn).toBe(`from-${room}`);
      t.get(back!, RoomExit).locked = false;
      standOn(back!);
      expect(
        t.until(() => t.engine.roomId === 'hub', 2),
        `"${room}" exit returns to the hub`,
      ).toBe(true);
      expect(t.pos('player').distanceTo(t.pos(`spawn-from-${room}`))).toBeLessThan(1);
    }
  });
});
