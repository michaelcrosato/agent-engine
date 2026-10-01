import { defineSystem } from '../../core/defineSystem.ts';
import { Transform } from '../../core/Transform.ts';
import { Died } from '../health/healthEvents.ts';
import { Explosive } from './Explosive.ts';
import { explode } from './explode.ts';

/**
 * Detonates Explosive entities when they die. Runs in the late phase before HealthSystem (which
 * destroys the dead) and keeps reading Died until a whole chain reaction has resolved this tick.
 */
export const ExplosiveSystem = defineSystem({
  name: 'ExplosiveSystem',
  doc: 'Explodes Explosive entities on death, resolving chain reactions within one tick.',
  phase: 'late',
  order: -10,
  run(ctx) {
    const w = ctx.world;
    for (
      let deaths = ctx.events.read(Died), guard = 0;
      deaths.length && guard < 64;
      deaths = ctx.events.read(Died), guard++
    ) {
      for (const d of deaths) {
        const x = w.get(d.entity, Explosive);
        const t = w.get(d.entity, Transform);
        if (!x || !t) continue;
        const center = t.pos.clone();
        center.y += 0.5;
        explode(ctx, center, {
          radius: x.radius,
          damage: x.damage,
          impulse: x.impulse,
          effect: x.effect,
          ...(d.from !== undefined ? { from: d.from } : {}),
        });
      }
    }
  },
});
