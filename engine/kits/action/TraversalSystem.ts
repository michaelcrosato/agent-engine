import { Vector3 } from 'three';
import { Animator } from '../../anim/Animator.ts';
import { defineSystem } from '../../core/defineSystem.ts';
import { Transform } from '../../core/Transform.ts';
import { CombatStats } from '../../mechanics/combat/CombatStats.ts';
import { Health } from '../../mechanics/health/Health.ts';
import { Model } from '../../model/Model.ts';
import { CharacterBody } from '../../physics/CharacterBody.ts';
import { CameraRig } from '../../render/CameraRig.ts';
import { Arsenal } from '../fps/Arsenal.ts';
import { FpsController } from '../fps/FpsController.ts';
import { Traversal } from './Traversal.ts';

export const TraversalSystem = defineSystem({
  name: 'TraversalSystem',
  doc: 'Fluid traversal on top of collision-safe character movement, with matching animation roles.',
  phase: 'update',
  order: 10,
  run(ctx) {
    const w = ctx.world;
    for (const e of w.query(Traversal, FpsController, CharacterBody, Transform)) {
      const tr = w.get(e, Traversal)!;
      const cb = w.get(e, CharacterBody)!;
      const c = w.get(e, FpsController)!;
      const t = w.get(e, Transform)!;
      if (w.get(e, Health)?.dead) continue;
      const dt = ctx.time.dt;
      tr.cooldown = Math.max(0, tr.cooldown - dt);
      tr.actionTime = Math.max(0, tr.actionTime - dt);
      const forward = new Vector3(0, 0, -1).applyQuaternion(t.rot);
      const ceiling = ctx.physics.raycast(
        t.pos.clone().add(new Vector3(0, tr.crouchingHeight, 0)),
        new Vector3(0, 1, 0),
        tr.standingHeight - tr.crouchingHeight + cb.radius,
        { layers: ['world', 'prop'], exclude: e },
      );
      const height =
        c.crouching || (cb.height < tr.standingHeight && ceiling) ? tr.crouchingHeight : tr.standingHeight;
      if (cb.height !== height) {
        cb.height = height;
        ctx.physics.refresh(e);
      }
      if (cb.grounded) tr.jumpsUsed = 0;
      if (ctx.input.pressed('jump') && !cb.grounded && c.coyote <= 0 && cb.velocity.y < c.jumpSpeed - 0.5) {
        if (tr.jumpsUsed < tr.airJumps) {
          cb.velocity.y = c.jumpSpeed;
          tr.jumpsUsed++;
          ctx.audio.play(c.jumpSound, { pitch: 1.25 });
        }
        // A chest-high obstacle with head clearance is mantleable; ceilings never are.
        const low = t.pos.clone().add(new Vector3(0, 0.7, 0));
        const high = t.pos.clone().add(new Vector3(0, 1.9, 0));
        if (
          ctx.physics.raycast(low, forward, 1.1, { layers: ['world'] }) &&
          !ctx.physics.raycast(high, forward, 1.4, { layers: ['world'] })
        ) {
          cb.velocity.y = Math.max(cb.velocity.y, 9);
        }
      }
      if (ctx.input.pressed('dash') && tr.cooldown <= 0) {
        tr.cooldown = tr.dashCooldown;
        tr.dashing = 0.18;
        tr.sliding = 0;
        tr.direction.copy(forward).multiplyScalar(ctx.input.axis('moveBack', 'moveForward'));
        tr.direction.addScaledVector(
          new Vector3(1, 0, 0).applyQuaternion(t.rot),
          ctx.input.axis('moveLeft', 'moveRight'),
        );
        if (tr.direction.lengthSq() < 0.01) tr.direction.copy(forward);
        tr.direction.normalize();
        ctx.audio.play('jump', { pitch: 0.7 });
      }
      if (
        ctx.input.pressed('crouch') &&
        cb.grounded &&
        Math.hypot(cb.velocity.x, cb.velocity.z) > c.walkSpeed * 0.85
      ) {
        tr.sliding = 0.85;
        tr.direction.set(cb.velocity.x, 0, cb.velocity.z).normalize();
      }
      if (!ctx.input.down('crouch') || ctx.input.pressed('jump')) tr.sliding = 0;
      const boost = tr.dashing > 0 ? tr.dashSpeed : tr.sliding > 0 ? 13 * (0.55 + tr.sliding * 0.5) : 0;
      if (boost) {
        const scale = w.get(e, CombatStats)?.movement ?? 1;
        ctx.physics.moveCharacter(e, tr.direction.clone().multiplyScalar(boost * scale * dt));
      }
      tr.dashing = Math.max(0, tr.dashing - dt);
      tr.sliding = Math.max(0, tr.sliding - dt);
      const rig = w.get(e, CameraRig);
      if (rig && ctx.input.pressed('camera')) rig.mode = rig.mode === 'third' ? 'first' : 'third';
      if (rig) {
        rig.offset.x = rig.mode === 'third' ? 0.65 : 0;
        rig.fov +=
          ((ctx.input.down('altFire') ? 60 : tr.dashing > 0 ? 92 : 80) - rig.fov) * Math.min(1, dt * 12);
      }
      const model = w.get(e, Model);
      if (model) model.visible = rig?.mode !== 'first';
      const a = w.get(e, Animator);
      const arsenal = w.get(e, Arsenal);
      if (a)
        a.play =
          tr.actionTime > 0
            ? tr.actionClip
            : tr.sliding > 0
              ? 'slide'
              : tr.dashing > 0
                ? 'dash'
                : !cb.grounded
                  ? 'jump'
                  : (arsenal?.reloading ?? 0) > 0
                    ? 'reload'
                    : ctx.input.down('fire')
                      ? 'attack'
                      : Math.hypot(cb.velocity.x, cb.velocity.z) > 1
                        ? ctx.input.down('sprint')
                          ? 'run'
                          : 'walk'
                        : 'idle';
    }
  },
});
