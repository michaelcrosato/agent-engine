import { defineSystem } from '../../core/defineSystem.ts';
import { Transform } from '../../core/Transform.ts';
import { spawnEffect } from '../../fx/spawnEffect.ts';
import { runSignalSpec } from '../../logic/SignalQueue.ts';
import { hp } from './applyDamage.ts';
import { Health } from './Health.ts';
import { Damaged, Died } from './healthEvents.ts';

/** Regeneration, plus on-death behavior: signals, death prefab, and destruction. */
export const HealthSystem = defineSystem({
  name: 'HealthSystem',
  doc: 'Regenerates Health and handles deaths (onDeath signals, deathPrefab, destroyOnDeath).',
  phase: 'late',
  run(ctx) {
    const w = ctx.world;
    for (const d of ctx.events.read(Damaged)) {
      const h = w.get(d.entity, Health);
      if (h?.hurtSound && !h.dead && d.kind !== 'hazard')
        ctx.audio.play(h.hurtSound, { at: w.get(d.entity, Transform)?.pos });
    }
    for (const d of ctx.events.read(Died)) {
      const h = w.get(d.entity, Health);
      if (!h) continue;
      for (const spec of h.onDeath) runSignalSpec(ctx, spec, d.entity);
      const t = w.get(d.entity, Transform);
      if (h.deathEffect && t) spawnEffect(ctx, h.deathEffect, t.pos.clone().setY(t.pos.y + 0.8));
      if (h.deathPrefab && t) ctx.spawn(h.deathPrefab, { pos: t.pos.clone(), rot: t.rot.clone() });
      if (h.destroyOnDeath && !w.hasTag(d.entity, 'player')) w.destroy(d.entity);
    }
    for (const e of w.query(Health)) {
      const h = w.get(e, Health)!;
      if (h.dead || h.regen <= 0 || ctx.time.elapsed - h.lastHit < h.regenDelay) continue;
      h.current = Math.min(h.max, hp(h) + h.regen * ctx.time.dt);
    }
  },
});
