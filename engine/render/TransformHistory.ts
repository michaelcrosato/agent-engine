import type { Quaternion, Vector3 } from 'three';
import { defineService } from '../core/defineService.ts';
import { defineSystem } from '../core/defineSystem.ts';
import { Transform } from '../core/Transform.ts';
import type { Entity } from '../core/World.ts';

/** Poses at the end of the previous tick, for smooth render interpolation. */
export type TransformHistory = Map<Entity, { pos: Vector3; rot: Quaternion }>;

export const TransformHistoryKey = defineService<TransformHistory>(
  'transformHistory',
  'Previous-tick poses (browser only).',
);

/** Records every moving entity's pose at tick start (browser only; no-op headless). */
export const TransformHistorySystem = defineSystem({
  name: 'TransformHistorySystem',
  doc: 'Stores previous-tick poses so frames can interpolate between fixed ticks.',
  phase: 'input',
  order: -1000,
  run(ctx) {
    const hist = ctx.engine.tryService(TransformHistoryKey);
    if (!hist) return;
    for (const e of ctx.world.query(Transform)) {
      if (ctx.world.hasTag(e, 'level')) continue;
      const t = ctx.world.get(e, Transform)!;
      const h = hist.get(e);
      if (h) {
        h.pos.copy(t.pos);
        h.rot.copy(t.rot);
      } else hist.set(e, { pos: t.pos.clone(), rot: t.rot.clone() });
    }
    for (const e of hist.keys()) if (!ctx.world.isAlive(e)) hist.delete(e);
  },
});

/** Interpolated pose of an entity for this frame (falls back to the current Transform). */
export function lerpPose(
  hist: TransformHistory | undefined,
  e: Entity,
  t: { pos: Vector3; rot: Quaternion },
  alpha: number,
  outPos: Vector3,
  outRot: Quaternion,
): void {
  const h = hist?.get(e);
  if (!h || alpha >= 1) {
    outPos.copy(t.pos);
    outRot.copy(t.rot);
    return;
  }
  outPos.lerpVectors(h.pos, t.pos, alpha);
  outRot.slerpQuaternions(h.rot, t.rot, alpha);
}
