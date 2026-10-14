import { defineSystem } from '../../core/defineSystem.ts';
import { Transform } from '../../core/Transform.ts';
import { spawnEffect } from '../../fx/spawnEffect.ts';
import { applyDamage } from '../health/applyDamage.ts';
import { Health } from '../health/Health.ts';
import { AreaPulse } from './AreaPulse.ts';

export const AreaPulseSystem = defineSystem({
  name: 'AreaPulseSystem',
  doc: 'Resolve delayed area attacks after their readable windup.',
  phase: 'update',
  order: 15,
  run(ctx) {
    const w = ctx.world;
    for (const e of w.query(AreaPulse, Transform)) {
      const pulse = w.get(e, AreaPulse)!;
      const t = w.get(e, Transform)!;
      pulse.age += ctx.time.dt;
      if (pulse.age < pulse.delay) continue;
      for (const target of w.tagged(pulse.targetTag)) {
        const at = w.get(target, Transform);
        if (!at || w.get(target, Health)?.dead || at.pos.distanceTo(t.pos) > pulse.radius) continue;
        // World geometry blocks the blast; open ground and airborne dodges remain reliable.
        const from = t.pos.clone().setY(t.pos.y + 0.5);
        const to = at.pos.clone().setY(at.pos.y + 0.6);
        if (!ctx.physics.lineOfSight(from, to, { layers: ['world'] })) continue;
        applyDamage(ctx, target, pulse.damage, {
          from: pulse.owner >= 0 ? pulse.owner : undefined,
          kind: 'explosion',
          element: pulse.element,
          point: at.pos.clone(),
        });
      }
      spawnEffect(ctx, pulse.effect, t.pos);
      w.destroy(e);
    }
  },
});
