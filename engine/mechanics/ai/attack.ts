import { Vector3 } from 'three';
import type { Ctx } from '../../core/Ctx.ts';
import type { ComponentData } from '../../core/defineComponent.ts';
import { Transform } from '../../core/Transform.ts';
import type { Entity } from '../../core/World.ts';
import { spawnEffect } from '../../fx/spawnEffect.ts';
import { applyDamage } from '../health/applyDamage.ts';
import { Projectile } from '../projectiles/Projectile.ts';
import type { Brain } from './Brain.ts';
import { eyeAt } from './perceive.ts';

/** Performs one attack from `self` on `target` according to the brain's style. */
export function attack(ctx: Ctx, self: Entity, target: Entity, b: ComponentData<typeof Brain>): void {
  const w = ctx.world;
  const from = eyeAt(w.get(self, Transform)!.pos, b.eye);
  const to = eyeAt(w.get(target, Transform)!.pos, 1.2);
  if (b.attackSound) ctx.audio.play(b.attackSound, { at: from });
  if (b.style === 'melee') {
    applyDamage(ctx, target, b.attackDamage, { from: self, kind: 'melee', point: to });
    return;
  }
  const dir = to.clone().sub(from).normalize();
  const err = (b.aimError * Math.PI) / 180;
  dir.add(new Vector3(ctx.rng.spread(err), ctx.rng.spread(err), ctx.rng.spread(err))).normalize();
  if (b.projectile) {
    const p = ctx.spawn(b.projectile, { pos: from.clone().addScaledVector(dir, 0.6) });
    const pr = w.get(p, Projectile);
    w.get(p, Transform)!.rot.setFromUnitVectors(new Vector3(0, 0, -1), dir);
    if (pr) pr.owner = self;
    return;
  }
  const hit = ctx.physics.raycast(from, dir, b.sight * 1.5, { exclude: self });
  const end = hit ? hit.point : from.clone().addScaledVector(dir, b.sight);
  spawnEffect(ctx, b.tracer, from, { to: end });
  if (hit) applyDamage(ctx, hit.entity, b.attackDamage, { from: self, kind: 'bullet', point: hit.point });
}
