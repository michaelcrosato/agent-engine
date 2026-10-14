import type { Ctx } from '../../core/Ctx.ts';
import { Transform } from '../../core/Transform.ts';
import type { Entity } from '../../core/World.ts';
import { spawnEffect } from '../../fx/spawnEffect.ts';
import { applyDamage } from '../health/applyDamage.ts';
import { Health } from '../health/Health.ts';
import { CombatStats } from './CombatStats.ts';
import { ElementState } from './ElementState.ts';

/** Nearby opponents, excluding the origin and allies. Bounded queries prevent recursive storms. */
export function combatNeighbors(ctx: Ctx, target: Entity, source: Entity, radius: number): Entity[] {
  const at = ctx.world.get(target, Transform)?.pos;
  if (!at) return [];
  const sourceIsPlayer = ctx.world.hasTag(source, 'player');
  return ctx.world
    .query(Health, Transform)
    .filter(
      (e) =>
        e !== target &&
        e !== source &&
        !ctx.world.get(e, Health)!.dead &&
        ctx.world.hasTag(e, 'enemy') === sourceIsPlayer &&
        ctx.world.get(e, Transform)!.pos.distanceToSquared(at) < radius * radius,
    );
}

/** Apply an element from any source; secondary damage cannot trigger further reactions. */
export function elementalHit(
  ctx: Ctx,
  target: Entity,
  source: Entity,
  element: string,
  damage: number,
): void {
  const w = ctx.world;
  if (!w.isAlive(target) || !w.has(target, Health)) return;
  const state = w.get(target, ElementState) ?? w.add(target, ElementState);
  const stats = w.get(source, CombatStats);
  const at = w.get(target, Transform)?.pos;
  if ((element === 'fire' && state.chill > 0) || (element === 'frost' && state.burn > 0)) {
    state.burn = 0;
    state.chill = 0;
    if (at) spawnEffect(ctx, 'impact', at);
    for (const e of [target, ...combatNeighbors(ctx, target, source, 4).slice(0, 12)]) {
      applyDamage(ctx, e, damage * 0.65, { from: source, kind: 'explosion', secondary: true });
    }
  } else if (element === 'fire') {
    state.burn = 3;
    state.power = Math.max(state.power, damage * 0.22);
    state.source = source;
  } else if (element === 'frost') state.chill = 2.5;
  if (element === 'shock') {
    const count = Math.min(8, (stats?.chains ?? 0) + (state.wet > 0 ? 3 : 0));
    for (const e of combatNeighbors(ctx, target, source, 7).slice(0, count)) {
      const to = w.get(e, Transform)!.pos.clone();
      if (at) spawnEffect(ctx, 'tracer', at.clone().setY(at.y + 1), { to: to.setY(to.y + 1) });
      applyDamage(ctx, e, damage * 0.55, { from: source, kind: 'bullet', secondary: true });
    }
  }
}
