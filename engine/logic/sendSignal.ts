import type { Ctx } from '../core/Ctx.ts';
import type { Entity } from '../core/World.ts';
import { Signal } from './Signal.ts';

/**
 * Sends `action` to a target: an entity id, an entity name ("door-1"), or "#tag" for every
 * entity with that tag. Unknown names log a warning once. Returns how many entities got it.
 */
export function sendSignal(
  ctx: Ctx,
  target: string | Entity,
  action: string,
  from?: Entity,
  value = 0,
): number {
  let targets: Entity[];
  if (typeof target === 'number') targets = [target];
  else if (target.startsWith('#')) targets = ctx.world.tagged(target.slice(1));
  else {
    const e = ctx.world.named(target);
    targets = e === undefined ? [] : [e];
  }
  if (!targets.length) {
    ctx.log.once(
      `signal:${target}`,
      `Signal "${action}" to "${String(target)}" found no entity (sent by ${from === undefined ? 'code' : ctx.world.label(from)}). ` +
        'Check the target name in the room file, or use "#tag" to address tagged entities.',
    );
  }
  for (const t of targets) ctx.events.emit(Signal, { target: t, action, from, value });
  return targets.length;
}

/** Signals aimed at `e` among this tick's unread signals (call once per system per tick). */
export function signalsFor(all: readonly { target: Entity; action: string }[], e: Entity): string[] {
  const out: string[] = [];
  for (const s of all) if (s.target === e) out.push(s.action);
  return out;
}
