import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { AmbientSound, Light } from '#engine/api.ts';
import { playtest } from '#engine/testing.ts';

describe('audio room', () => {
  test('ambient emitters start with the room: a looping hum and periodic drips', async () => {
    const t = await playtest('fps-demo', 'audio');
    t.wait(4);
    expect(t.sounds('hum')).toHaveLength(1);
    expect(t.sounds('drip').length).toBeGreaterThanOrEqual(1);
    expect(t.engine.audio.currentMusic).toBe('calm');
  });

  test('stepping on a pad plays its sound', async () => {
    const t = await playtest('fps-demo', 'audio');
    expect(t.walkTo('pad-explosion')).toBe(true);
    t.wait(0.2);
    expect(t.sounds('explosion')).toHaveLength(1);
  });

  test('walking into a music zone switches the song', async () => {
    const t = await playtest('fps-demo', 'audio');
    expect(t.walkTo('zone-tense')).toBe(true);
    t.wait(0.2);
    expect(t.engine.audio.currentMusic).toBe('tense');
    expect(t.walkTo('zone-eerie')).toBe(true);
    t.wait(0.2);
    expect(t.engine.audio.currentMusic).toBe('eerie');
  });

  test('the power switch turns the machine hum and both lamps off with one "#power" signal', async () => {
    const t = await playtest('fps-demo', 'audio');
    expect(t.walkTo(new Vector3(28.4, 0, 6.5))).toBe(true);
    t.lookAt('power-switch', 0.35);
    t.press('use');
    t.tick(); // signals reach receivers that already ran this tick on the next tick
    expect(t.get('hum', AmbientSound).on).toBe(false);
    expect([t.get('lamp-1', Light).on, t.get('lamp-2', Light).on]).toEqual([false, false]);
    expect(t.get('drip', Light).on).toBe(true);
  });
});
