import { Vector3 } from 'three';
import type { Ctx } from '../../core/Ctx.ts';
import { defineEvent } from '../../core/defineEvent.ts';
import { Transform } from '../../core/Transform.ts';
import type { Entity } from '../../core/World.ts';
import { spawnEffect } from '../../fx/spawnEffect.ts';
import { CharacterBody } from '../../physics/CharacterBody.ts';
import { applyDamage } from '../health/applyDamage.ts';

export const Exploded = defineEvent<{ pos: Vector3; radius: number; from: Entity | undefined }>(
  'Exploded',
  'An explosion happened (splash damage and impulses already applied).',
);

export type ExplodeOpts = {
  radius: number;
  damage: number;
  /** Push strength at the center (m/s for characters, impulse scale for props). */
  impulse: number;
  from?: Entity;
  effect?: string;
};

/** Splash damage + knockback in a sphere, falling off linearly with distance. */
export function explode(ctx: Ctx, center: Vector3, o: ExplodeOpts): void {
  const w = ctx.world;
  const dir = new Vector3();
  for (const e of ctx.physics.overlapSphere(center, o.radius)) {
    const t = w.get(e, Transform);
    if (!t) continue;
    const target = t.pos.clone();
    target.y += 0.5;
    dir.subVectors(target, center);
    const dist = dir.length();
    const k = Math.max(0, 1 - dist / o.radius);
    if (k <= 0) continue;
    dir.normalize();
    dir.y = Math.max(dir.y, 0.35);
    dir.normalize();
    applyDamage(ctx, e, o.damage * k, {
      kind: 'explosion',
      point: center,
      ...(o.from !== undefined ? { from: o.from } : {}),
    });
    const cb = w.get(e, CharacterBody);
    if (cb) cb.velocity.addScaledVector(dir, o.impulse * k);
    else ctx.physics.applyImpulse(e, dir.multiplyScalar(o.impulse * k * Math.max(1, ctx.physics.mass(e))));
  }
  if (o.effect) spawnEffect(ctx, o.effect, center, { normal: new Vector3(0, 1, 0) });
  ctx.events.emit(Exploded, { pos: center.clone(), radius: o.radius, from: o.from });
}
