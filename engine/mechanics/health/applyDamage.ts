import type { Vector3 } from 'three';
import type { Ctx } from '../../core/Ctx.ts';
import type { Entity } from '../../core/World.ts';
import { CombatStats } from '../combat/CombatStats.ts';
import { ElementState } from '../combat/ElementState.ts';
import { Health } from './Health.ts';
import { Damaged, type DamageKind, Died, Healed } from './healthEvents.ts';

export type DamageOpts = {
  from?: Entity;
  kind?: DamageKind;
  point?: Vector3;
  /** Already-scaled reaction damage; cannot crit, leech or trigger another reaction. */
  secondary?: boolean;
  element?: string;
};

/** Current hit points (resolving the -1 = max convention). */
export function hp(h: { current: number; max: number }): number {
  return h.current < 0 ? h.max : h.current;
}

/**
 * Deals damage to an entity with Health (others are ignored). Armor absorbs part of it.
 * Emits Damaged, and Died when it reaches 0. Returns the hit points actually removed.
 */
export function applyDamage(ctx: Ctx, target: Entity, amount: number, opts: DamageOpts = {}): number {
  const h = ctx.world.get(target, Health);
  if (!h || h.dead || h.invulnerable || amount <= 0 || !Number.isFinite(amount)) return 0;
  let dmg = amount;
  const source = opts.from === undefined ? undefined : ctx.world.get(opts.from, CombatStats);
  const defense = ctx.world.get(target, CombatStats);
  const critical = !opts.secondary && !!source && ctx.rng.chance(source.critical);
  if (!opts.secondary && source) {
    dmg *= source.damage * (critical ? source.criticalDamage : 1);
    if (opts.from !== undefined && (ctx.world.get(opts.from, ElementState)?.charged ?? 0) > 0) dmg *= 1.5;
  }
  dmg *= defense?.incoming ?? 1;
  if (h.armor > 0) {
    const absorbed = Math.min(h.armor, dmg * h.armorAbsorb);
    h.armor -= absorbed;
    dmg -= absorbed;
  }
  const before = hp(h);
  h.current = Math.max(0, before - dmg);
  h.lastHit = ctx.time.elapsed;
  const kind = opts.kind ?? 'other';
  ctx.events.emit(Damaged, {
    entity: target,
    amount: before - h.current,
    from: opts.from,
    kind,
    point: opts.point,
    secondary: opts.secondary,
    critical,
    element: opts.element ?? source?.element,
  });
  if (h.current <= 0) {
    h.dead = true;
    ctx.events.emit(Died, { entity: target, from: opts.from, kind, secondary: opts.secondary });
  }
  return before - h.current;
}

/** Restores hit points up to max (or `overheal` above it). Returns the amount healed. */
export function heal(ctx: Ctx, target: Entity, amount: number, overheal = 0): number {
  const h = ctx.world.get(target, Health);
  if (!h || h.dead) return 0;
  const before = hp(h);
  h.current = Math.min(h.max + overheal, before + amount);
  const gained = h.current - before;
  if (gained > 0) ctx.events.emit(Healed, { entity: target, amount: gained });
  return gained;
}
