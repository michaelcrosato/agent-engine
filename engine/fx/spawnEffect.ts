import type { Vector3 } from 'three';
import type { Ctx } from '../core/Ctx.ts';
import { EffectKind } from './Effect.ts';
import { EffectSpawned } from './effectEvents.ts';

/**
 * Spawns a visual effect (and its sound) at `pos`. `normal` aims bursts (surface normal);
 * `to` is the end point for tracers. Unknown ids log a teaching warning once.
 */
export function spawnEffect(
  ctx: Ctx,
  id: string,
  pos: Vector3,
  opts: { normal?: Vector3; to?: Vector3 } = {},
): void {
  if (!id) return;
  if (!ctx.content.has(EffectKind, id)) {
    ctx.log.once(
      `effect:${id}`,
      `Effect "${id}" not found. Add data/effects/${id}.json (npm run new -- effect ${id}).`,
    );
    return;
  }
  const fx = ctx.content.get(EffectKind, id);
  if (fx.sound) ctx.audio.play(fx.sound, { at: pos });
  ctx.events.emit(EffectSpawned, {
    effect: id,
    pos: pos.clone(),
    normal: opts.normal?.clone(),
    to: opts.to?.clone(),
  });
}
