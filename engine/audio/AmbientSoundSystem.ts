import { defineSystem } from '../core/defineSystem.ts';
import { Transform } from '../core/Transform.ts';
import { Signal } from '../logic/Signal.ts';
import { AmbientSound } from './AmbientSound.ts';

/** Starts/stops ambient loops and fires periodic ambient sounds; "on"/"off"/"toggle" signals switch them. */
export const AmbientSoundSystem = defineSystem({
  name: 'AmbientSoundSystem',
  doc: 'Plays AmbientSound components (loops follow their entity).',
  phase: 'update',
  run(ctx) {
    const now = ctx.time.elapsed;
    for (const s of ctx.events.read(Signal)) {
      const a = ctx.world.get(s.target, AmbientSound);
      if (!a) continue;
      if (s.action === 'on' || s.action === 'off') a.on = s.action === 'on';
      else if (s.action === 'toggle') a.on = !a.on;
    }
    for (const e of ctx.world.query(AmbientSound, Transform)) {
      const a = ctx.world.get(e, AmbientSound)!;
      if (!a.sound) continue;
      if (a.interval === 0) {
        if (a.on && !a.voice) a.voice = ctx.audio.play(a.sound, { follow: e, volume: a.volume, loop: true });
        if (!a.on && a.voice) {
          ctx.audio.stop(a.voice);
          a.voice = 0;
        }
        continue;
      }
      if (!a.on || now < a.next) continue;
      ctx.audio.play(a.sound, { at: ctx.world.get(e, Transform)!.pos, volume: a.volume });
      a.next = now + a.interval * (1 + ctx.rng.spread(a.jitter));
    }
  },
});
