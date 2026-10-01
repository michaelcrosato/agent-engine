import { Vector3 } from 'three';
import type { Ctx } from '../../core/Ctx.ts';
import { Transform } from '../../core/Transform.ts';
import type { Entity } from '../../core/World.ts';
import { yawOf } from '../../math/yaw.ts';

/** Eye position of an entity standing at `pos` (`eye` meters up). */
export function eyeAt(pos: Vector3, eye: number): Vector3 {
  return new Vector3(pos.x, pos.y + eye, pos.z);
}

/**
 * Whether `self` perceives `target`: within hearing radius, or within sight distance and the
 * view cone, with nothing solid in between.
 */
export function perceive(
  ctx: Ctx,
  self: Entity,
  target: Entity,
  b: { sight: number; fov: number; hearing: number; eye: number },
): boolean {
  const w = ctx.world;
  const st = w.get(self, Transform);
  const tt = w.get(target, Transform);
  if (!st || !tt) return false;
  const from = eyeAt(st.pos, b.eye);
  const to = eyeAt(tt.pos, 1.4);
  const d = to.clone().sub(from);
  const dist = d.length();
  if (dist > b.sight) return false;
  if (dist > b.hearing && b.fov < 360) {
    const yaw = (yawOf(st.rot) * Math.PI) / 180;
    const fwd = new Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const flat = new Vector3(d.x, 0, d.z).normalize();
    if ((Math.acos(Math.max(-1, Math.min(1, fwd.dot(flat)))) * 180) / Math.PI > b.fov / 2) return false;
  }
  const hit = ctx.physics.raycast(from, d, dist, { exclude: self });
  return !hit || hit.entity === target;
}
