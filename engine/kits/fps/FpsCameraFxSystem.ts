import { Euler, Quaternion } from 'three';
import { defineSystem } from '../../core/defineSystem.ts';
import { CharacterBody } from '../../physics/CharacterBody.ts';
import { RendererKey } from '../../render/Renderer.ts';
import { FpsController } from './FpsController.ts';

const q = new Quaternion();
const e = new Euler();

/** Visual-only camera motion for the first-person player: head bob, landing dip, slight roll. */
export const FpsCameraFxSystem = defineSystem({
  name: 'FpsCameraFxSystem',
  doc: 'Head bob, landing dip, and strafe roll on the render camera (browser only).',
  phase: 'frame',
  order: 55,
  run(ctx) {
    const r = ctx.engine.tryService(RendererKey);
    if (!r || r.cameraOverride) return;
    for (const p of ctx.world.query(FpsController, CharacterBody)) {
      const c = ctx.world.get(p, FpsController)!;
      const cb = ctx.world.get(p, CharacterBody)!;
      const speed = Math.hypot(cb.velocity.x, cb.velocity.z);
      const amount = cb.grounded ? Math.min(1, speed / 7) : 0;
      r.camera.position.y += Math.sin(c.bobPhase * 2) * 0.035 * amount - c.landKick * 0.12;
      r.camera.translateX(Math.cos(c.bobPhase) * 0.02 * amount);
      e.set(0, 0, Math.cos(c.bobPhase) * 0.006 * amount);
      r.camera.quaternion.multiply(q.setFromEuler(e));
      return;
    }
  },
});
