import { describe, expect, test } from 'vitest';
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
});
