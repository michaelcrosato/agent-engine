import { Vector3 } from 'three';
import { Mover } from '../../anim/Mover.ts';
import { defineSystem } from '../../core/defineSystem.ts';
import { Transform } from '../../core/Transform.ts';
import { yawOf, yawQuat } from '../../math/yaw.ts';
import { applyDamage } from '../../mechanics/health/applyDamage.ts';
import { Health } from '../../mechanics/health/Health.ts';
import { CharacterBody } from '../../physics/CharacterBody.ts';
import { CameraRig } from '../../render/CameraRig.ts';
import { FpsController } from './FpsController.ts';

const wish = new Vector3();
const DOWN = new Vector3(0, -1, 0);

function approach(cur: number, target: number, maxStep: number): number {
  return cur < target ? Math.min(target, cur + maxStep) : Math.max(target, cur - maxStep);
}

/** Applies look input and first-person movement to FpsController entities. */
export const FpsControllerSystem = defineSystem({
  name: 'FpsControllerSystem',
  doc: 'First-person look + movement (accel, coyote time, jump buffer, platforms, footsteps).',
  phase: 'update',
  run(ctx) {
    const w = ctx.world;
    const dt = ctx.time.dt;
    const input = ctx.input;
    for (const e of w.query(FpsController, CharacterBody, Transform)) {
      const c = w.get(e, FpsController)!;
      const cb = w.get(e, CharacterBody)!;
      const t = w.get(e, Transform)!;
      const rig = w.get(e, CameraRig);
      if (w.get(e, Health)?.dead) continue;
      const yaw = yawOf(t.rot) - input.look.x;
      t.rot.copy(yawQuat(yaw));
      if (rig) rig.pitch = Math.max(-89, Math.min(89, rig.pitch + input.look.y));
      c.crouching = input.down('crouch');
      if (rig) rig.offset.y = approach(rig.offset.y, c.crouching ? c.crouchEye : c.eyeHeight, dt * 6);
      const fwd = new Vector3(0, 0, -1).applyQuaternion(t.rot);
      const right = new Vector3(1, 0, 0).applyQuaternion(t.rot);
      wish
        .set(0, 0, 0)
        .addScaledVector(fwd, input.axis('moveBack', 'moveForward'))
        .addScaledVector(right, input.axis('moveLeft', 'moveRight'));
      if (wish.lengthSq() > 1) wish.normalize();
      const speed = c.crouching ? c.crouchSpeed : input.down('sprint') ? c.sprintSpeed : c.walkSpeed;
      const v = cb.velocity;
      const a = (cb.grounded ? c.accel : c.airAccel) * dt;
      v.x = approach(v.x, wish.x * speed, a);
      v.z = approach(v.z, wish.z * speed, a);
      if (input.pressed('jump')) c.buffered = c.jumpBuffer;
      else c.buffered = Math.max(0, c.buffered - dt);
      if (cb.grounded && v.y <= 0) {
        c.coyote = c.coyoteTime;
        v.y = -2;
      } else {
        c.coyote = Math.max(0, c.coyote - dt);
        v.y = Math.max(-c.maxFall, v.y - c.gravity * dt);
      }
      if (c.buffered > 0 && c.coyote > 0) {
        v.y = c.jumpSpeed;
        c.buffered = 0;
        c.coyote = 0;
        if (c.jumpSound) ctx.audio.play(c.jumpSound);
      }
      const delta = new Vector3(v.x * dt, v.y * dt, v.z * dt);
      const ground = ctx.physics.raycast(t.pos.clone().add(new Vector3(0, 0.25, 0)), DOWN, 0.45, {
        exclude: e,
      });
      const carrier = ground ? w.get(ground.entity, Mover) : undefined;
      if (carrier && cb.grounded) {
        delta.x += carrier.delta.x;
        delta.z += carrier.delta.z;
        if (v.y <= 0) delta.y = carrier.delta.y;
      }
      const before = t.pos.clone();
      const res = ctx.physics.moveCharacter(e, delta);
      if (v.y > 0 && res.moved.y < delta.y * 0.5) v.y = 0;
      if (!c.wasGrounded && res.grounded) {
        c.landKick = Math.min(1, Math.max(0, -c.lastFallSpeed - 4) / 12);
        if (c.landKick > 0.05 && c.landSound) ctx.audio.play(c.landSound, { volume: 0.4 + c.landKick });
        if (c.fallDamage > 0 && -c.lastFallSpeed > 16)
          applyDamage(ctx, e, (-c.lastFallSpeed - 16) * c.fallDamage, { kind: 'fall' });
      } else c.landKick = Math.max(0, c.landKick - dt * 4);
      c.lastFallSpeed = v.y;
      c.wasGrounded = res.grounded;
      const moved = Math.hypot(t.pos.x - before.x, t.pos.z - before.z);
      if (res.grounded && moved > 0.001) {
        c.stepAcc += moved;
        c.bobPhase += (moved / c.stepDistance) * Math.PI * 2;
        if (c.stepAcc >= c.stepDistance) {
          c.stepAcc = 0;
          if (c.footstepSound) ctx.audio.play(c.footstepSound, { volume: c.crouching ? 0.3 : 0.7 });
        }
      }
    }
  },
});
