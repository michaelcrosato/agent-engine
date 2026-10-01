import { defineSystem } from '../../core/defineSystem.ts';
import { Transform } from '../../core/Transform.ts';
import { applyDamage, hp } from './applyDamage.ts';
import { Health } from './Health.ts';

/** Below this height things have fallen out of the level (pits, holes). */
export const KILL_Y = -25;

/** Kills entities with Health that fall below KILL_Y; destroys other non-persistent ones. */
export const OutOfBoundsSystem = defineSystem({
  name: 'OutOfBoundsSystem',
  doc: `Entities falling below y = ${KILL_Y} die (Health) or are removed.`,
  phase: 'late',
  run(ctx) {
    const w = ctx.world;
    for (const e of w.query(Transform)) {
      if (w.get(e, Transform)!.pos.y > KILL_Y) continue;
      const h = w.get(e, Health);
      if (h) {
        if (!h.dead) applyDamage(ctx, e, hp(h) + h.armor + 1, { kind: 'fall' });
      } else if (!w.hasTag(e, 'persist')) w.destroy(e);
    }
  },
});
