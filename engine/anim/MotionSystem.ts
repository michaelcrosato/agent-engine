import { Euler, MathUtils, Quaternion } from 'three';
import { defineSystem } from '../core/defineSystem.ts';
import { Transform } from '../core/Transform.ts';
import { Motion } from './Motion.ts';

const q = new Quaternion();
const e = new Euler();

/** Applies Motion (spin and bob) to Transforms every tick. */
export const MotionSystem = defineSystem({
  name: 'MotionSystem',
  doc: 'Spins and bobs entities with a Motion component.',
  phase: 'update',
  run(ctx) {
    const dt = ctx.time.dt;
    for (const ent of ctx.world.query(Motion, Transform)) {
      const m = ctx.world.get(ent, Motion)!;
      const t = ctx.world.get(ent, Transform)!;
      if (m.spin.lengthSq() > 0) {
        e.set(
          MathUtils.degToRad(m.spin.x * dt),
          MathUtils.degToRad(m.spin.y * dt),
          MathUtils.degToRad(m.spin.z * dt),
          'YXZ',
        );
        t.rot.multiply(q.setFromEuler(e));
      }
      if (m.bob > 0) {
        if (!m.started) {
          m.baseY = t.pos.y;
          m.started = true;
        }
        t.pos.y = m.baseY + m.bob * (0.5 + 0.5 * Math.sin(ctx.time.elapsed * m.bobRate * Math.PI * 2 + ent));
      }
    }
  },
});
