import { defineSystem } from '../core/defineSystem.ts';
import { Contact, TriggerEntered, TriggerExited } from './physicsEvents.ts';

/** Syncs bodies with components, steps Rapier, writes dynamic poses back, emits physics events. */
export const PhysicsSystem = defineSystem({
  name: 'PhysicsSystem',
  doc: 'Steps the physics world and emits TriggerEntered/TriggerExited/Contact events.',
  phase: 'physics',
  run(ctx) {
    ctx.physics.sync();
    ctx.physics.step(ctx.time.dt, (a, b, started, sensor) => {
      if (sensor === 'none') {
        ctx.events.emit(Contact, { a, b, started });
        return;
      }
      const trigger = sensor === 'a' ? a : b;
      const other = sensor === 'a' ? b : a;
      ctx.events.emit(started ? TriggerEntered : TriggerExited, { trigger, other });
    });
  },
});
