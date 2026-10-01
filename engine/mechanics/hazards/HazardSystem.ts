import { defineSystem } from '../../core/defineSystem.ts';
import { TriggerEntered, TriggerExited } from '../../physics/physicsEvents.ts';
import { applyDamage } from '../health/applyDamage.ts';
import { Hazard } from './Hazard.ts';

/** Tracks who stands in each Hazard and applies its damage per second. */
export const HazardSystem = defineSystem({
  name: 'HazardSystem',
  doc: 'Hazard volumes: damage over time while inside.',
  phase: 'late',
  run(ctx) {
    const w = ctx.world;
    for (const ev of ctx.events.read(TriggerEntered)) {
      const h = w.get(ev.trigger, Hazard);
      if (!h || (h.filter !== 'any' && !w.hasTag(ev.other, h.filter))) continue;
      if (!h.inside.includes(ev.other)) h.inside.push(ev.other);
      if (h.sound) ctx.audio.play(h.sound, { follow: ev.other });
    }
    for (const ev of ctx.events.read(TriggerExited)) {
      const h = w.get(ev.trigger, Hazard);
      if (h) h.inside = h.inside.filter((x) => x !== ev.other);
    }
    for (const e of w.query(Hazard)) {
      const h = w.get(e, Hazard)!;
      h.inside = h.inside.filter((x) => w.isAlive(x));
      for (const v of h.inside) applyDamage(ctx, v, h.dps * ctx.time.dt, { kind: 'hazard', from: e });
    }
  },
});
