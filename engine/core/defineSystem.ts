import type { Ctx } from './Ctx.ts';

/**
 * Tick phases, in order. `input`→`update`→`physics`→`late` run every fixed tick (also headless).
 * `frame` runs once per rendered frame in the browser only (visuals, camera, HUD, audio listener).
 */
export type Phase = 'input' | 'update' | 'physics' | 'late' | 'frame';

export const TICK_PHASES: readonly Phase[] = ['input', 'update', 'physics', 'late'];

export type SystemDef = {
  readonly kind: 'system';
  readonly name: string;
  readonly doc: string;
  readonly phase: Phase;
  /** Lower runs first within a phase; ties keep plugin order. Default 0. */
  readonly order: number;
  readonly run: (ctx: Ctx) => void;
};

/**
 * Defines a system: a function run every tick (or frame) over the world.
 *
 *   export const RegenSystem = defineSystem({
 *     name: 'RegenSystem',
 *     doc: 'Heals entities with Health.regen > 0.',
 *     phase: 'update',
 *     run(ctx) { for (const e of ctx.world.query(Health)) { ... } },
 *   });
 */
export function defineSystem(def: {
  name: string;
  doc: string;
  phase: Phase;
  order?: number;
  run: (ctx: Ctx) => void;
}): SystemDef {
  return { kind: 'system', order: 0, ...def };
}
