import { Vector3 } from 'three';
import { defineSystem } from '../../core/defineSystem.ts';
import { Transform } from '../../core/Transform.ts';
import { spawnEffect } from '../../fx/spawnEffect.ts';
import { applyDamage } from '../health/applyDamage.ts';
import { Died } from '../health/healthEvents.ts';
import { Explosive } from './Explosive.ts';
import { explode } from './explode.ts';
import { Projectile } from './Projectile.ts';

const FORWARD = new Vector3(0, 0, -1);
const step = new Vector3();

/** Moves projectiles by ray-stepping, resolves hits and splash, and detonates Explosives on death. */
export const ProjectileSystem = defineSystem({
  name: 'ProjectileSystem',
  doc: 'Flies Projectile entities; impacts deal damage/splash; Explosive entities explode on death.',
  phase: 'update',
  run(ctx) {
    const w = ctx.world;
    const dt = ctx.time.dt;
    for (const e of w.query(Projectile, Transform)) {
      const p = w.get(e, Projectile)!;
      const t = w.get(e, Transform)!;
      if (!p.started) {
        p.velocity.copy(FORWARD).applyQuaternion(t.rot).multiplyScalar(p.speed);
        p.started = true;
      }
      p.age += dt;
      p.velocity.y -= p.gravity * dt;
      step.copy(p.velocity).multiplyScalar(dt);
      const dist = step.length();
      const exclude = p.owner >= 0 ? [e, p.owner] : [e];
      const hit = dist > 0 ? ctx.physics.raycast(t.pos, step, dist, { exclude }) : null;
      if (hit && p.bounces > 0) {
        p.bounces--;
        p.velocity.reflect(hit.normal).multiplyScalar(0.6);
        t.pos.copy(hit.point).addScaledVector(hit.normal, 0.05);
        continue;
      }
      if (hit || p.age >= p.lifetime) {
        const at = hit ? hit.point : t.pos.clone();
        const from = p.owner >= 0 ? p.owner : undefined;
        if (hit)
          applyDamage(ctx, hit.entity, p.damage, {
            kind: 'bullet',
            point: at,
            ...(from !== undefined ? { from } : {}),
          });
        if (p.splashRadius > 0) {
          explode(ctx, at, {
            radius: p.splashRadius,
            damage: p.splashDamage,
            impulse: p.impulse,
            effect: p.hitEffect,
            ...(from !== undefined ? { from } : {}),
          });
        } else spawnEffect(ctx, p.hitEffect, at, hit ? { normal: hit.normal } : {});
        w.destroy(e);
        continue;
      }
      t.pos.add(step);
      if (dist > 1e-6) t.rot.setFromUnitVectors(FORWARD, step.normalize());
    }
    for (const d of ctx.events.read(Died)) {
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
  },
});
