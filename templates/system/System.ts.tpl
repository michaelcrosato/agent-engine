import { defineSystem, Transform } from '#engine/api.ts';
import { __Comp__ } from './__Comp__.ts';

/** Runs every tick for entities with __Comp__ (+ Transform). */
export const __Name__ = defineSystem({
  name: '__Name__',
  doc: '__doc__',
  phase: 'update',
  run(ctx) {
    for (const e of ctx.world.query(__Comp__, Transform)) {
      const c = ctx.world.get(e, __Comp__)!;
      c.timer += ctx.time.dt * c.speed;
    }
  },
});
