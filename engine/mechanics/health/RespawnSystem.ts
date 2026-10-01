import { defineSystem } from '../../core/defineSystem.ts';
import { Health } from './Health.ts';
import { Died } from './healthEvents.ts';
import { Respawn } from './Respawn.ts';

/** Revives entities with Respawn after their delay, optionally reloading the room. */
export const RespawnSystem = defineSystem({
  name: 'RespawnSystem',
  doc: 'Revives dead Respawn entities after a delay (player death → room restart).',
  phase: 'late',
  run(ctx) {
    const w = ctx.world;
    for (const d of ctx.events.read(Died)) {
      const r = w.get(d.entity, Respawn);
      if (r) r.diedAt = ctx.time.elapsed;
    }
    for (const e of w.query(Respawn, Health)) {
      const r = w.get(e, Respawn)!;
      if (r.diedAt < 0 || ctx.time.elapsed - r.diedAt < r.delay) continue;
      r.diedAt = -1;
      const h = w.get(e, Health)!;
      h.dead = false;
      h.current = h.max;
      h.armor = 0;
      if (r.reloadRoom) ctx.engine.requestRoom(ctx.engine.roomId);
    }
  },
});
