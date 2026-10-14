import { defineSystem } from '../../core/defineSystem.ts';
import { Transform } from '../../core/Transform.ts';
import { spawnEffect } from '../../fx/spawnEffect.ts';
import { applyDamage, heal } from '../health/applyDamage.ts';
import { Health } from '../health/Health.ts';
import { Damaged, Died } from '../health/healthEvents.ts';
import { CombatStats } from './CombatStats.ts';
import { ElementState } from './ElementState.ts';
import { combatNeighbors, elementalHit } from './elementalHit.ts';

export const ElementSystem = defineSystem({
  name: 'ElementSystem',
  doc: 'Elemental reactions, leech, bounded death explosions and periodic burn damage.',
  phase: 'late',
  order: -30,
  run(ctx) {
    const w = ctx.world;
    for (const hit of ctx.events.read(Damaged)) {
      if (hit.from === undefined || hit.secondary || hit.amount <= 0) continue;
      const stats = w.get(hit.from, CombatStats);
      if (!stats) continue;
      if (stats.leech) heal(ctx, hit.from, hit.amount * stats.leech);
      elementalHit(ctx, hit.entity, hit.from, hit.element ?? stats.element, hit.amount);
    }
    for (const death of ctx.events.read(Died)) {
      if (death.from === undefined || death.secondary) continue;
      const stats = w.get(death.from, CombatStats);
      const at = w.get(death.entity, Transform)?.pos;
      if (!stats?.detonate || !at) continue;
      spawnEffect(ctx, 'explosion', at);
      const damage = (w.get(death.entity, Health)?.max ?? 0) * stats.detonate;
      for (const e of combatNeighbors(ctx, death.entity, death.from, 5).slice(0, 16)) {
        applyDamage(ctx, e, damage, { from: death.from, kind: 'explosion', secondary: true });
      }
    }
    for (const e of w.query(ElementState)) {
      const s = w.get(e, ElementState)!;
      if (s.burn > 0) {
        s.pulse += ctx.time.dt;
        if (s.pulse >= 0.5) {
          s.pulse -= 0.5;
          applyDamage(ctx, e, s.power * 0.5, {
            from: s.source >= 0 ? s.source : undefined,
            kind: 'hazard',
            secondary: true,
          });
        }
      } else {
        s.power = 0;
        s.pulse = 0;
      }
      for (const key of ['burn', 'chill', 'wet', 'charged'] as const)
        s[key] = Math.max(0, s[key] - ctx.time.dt);
    }
  },
});
