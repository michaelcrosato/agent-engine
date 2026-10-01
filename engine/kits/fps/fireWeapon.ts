import { Vector3 } from 'three';
import type { Ctx } from '../../core/Ctx.ts';
import { Transform } from '../../core/Transform.ts';
import type { Entity } from '../../core/World.ts';
import { spawnEffect } from '../../fx/spawnEffect.ts';
import { applyDamage } from '../../mechanics/health/applyDamage.ts';
import { Projectile } from '../../mechanics/projectiles/Projectile.ts';
import { CameraRig } from '../../render/CameraRig.ts';
import { viewRay } from '../../render/viewRay.ts';
import type { WeaponData } from './weaponData.ts';
import { WeaponFired } from './weaponEvents.ts';

const UP = new Vector3(0, 1, 0);

/** A random direction inside a cone of `deg` half-angle around `dir` (center-weighted). */
export function spreadDir(ctx: Ctx, dir: Vector3, deg: number): Vector3 {
  if (deg <= 0) return dir.clone();
  const side =
    Math.abs(dir.y) > 0.99 ? new Vector3(1, 0, 0) : new Vector3().crossVectors(dir, UP).normalize();
  const up = new Vector3().crossVectors(side, dir).normalize();
  const r = Math.tan((deg * Math.PI) / 180) * Math.sqrt(ctx.rng.next());
  const a = ctx.rng.next() * Math.PI * 2;
  return dir
    .clone()
    .addScaledVector(side, Math.cos(a) * r)
    .addScaledVector(up, Math.sin(a) * r)
    .normalize();
}

/** Fires one shot of a weapon from an entity's eye (ammo already paid). Returns entities hit. */
export function fireWeapon(ctx: Ctx, shooter: Entity, id: string, wd: WeaponData): Entity[] {
  const w = ctx.world;
  const { origin, dir } = viewRay(w, shooter);
  const t = w.get(shooter, Transform)!;
  const right = new Vector3(1, 0, 0).applyQuaternion(t.rot);
  const muzzle = origin
    .clone()
    .addScaledVector(dir, 0.6)
    .addScaledVector(right, 0.12)
    .add(new Vector3(0, -0.1, 0));
  const hits: Entity[] = [];
  if (wd.mode === 'projectile' && wd.projectile) {
    const p = ctx.spawn(wd.projectile, { pos: origin.clone().addScaledVector(dir, 0.7) });
    w.get(p, Transform)!.rot.setFromUnitVectors(new Vector3(0, 0, -1), dir);
    const pr = w.get(p, Projectile);
    if (pr) pr.owner = shooter;
  } else {
    for (let i = 0; i < wd.pellets; i++) {
      const d = spreadDir(ctx, dir, wd.spread);
      const hit = ctx.physics.raycast(origin, d, wd.range, { exclude: shooter });
      const end = hit ? hit.point : origin.clone().addScaledVector(d, wd.range);
      if (wd.mode === 'hitscan' && wd.tracer) spawnEffect(ctx, wd.tracer, muzzle, { to: end });
      if (!hit) continue;
      applyDamage(ctx, hit.entity, wd.damage, {
        from: shooter,
        kind: wd.mode === 'melee' ? 'melee' : 'bullet',
        point: hit.point,
      });
      if (wd.impulse > 0)
        ctx.physics.applyImpulse(hit.entity, d.clone().multiplyScalar(wd.impulse), hit.point);
      spawnEffect(ctx, wd.impactEffect, hit.point, { normal: hit.normal });
      hits.push(hit.entity);
    }
  }
  if (wd.muzzleEffect && wd.mode !== 'melee') spawnEffect(ctx, wd.muzzleEffect, muzzle, { normal: dir });
  if (wd.sound) ctx.audio.play(wd.sound);
  const rig = w.get(shooter, CameraRig);
  if (rig && wd.kick > 0) rig.pitch = Math.min(89, rig.pitch + wd.kick * (0.7 + ctx.rng.next() * 0.6));
  ctx.events.emit(WeaponFired, { shooter, weapon: id, origin, dir, hits });
  return hits;
}
