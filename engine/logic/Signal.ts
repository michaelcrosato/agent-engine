import { defineEvent } from '../core/defineEvent.ts';
import type { Entity } from '../core/World.ts';

/**
 * A named command sent to an entity ("open", "toggle", "spawn", ...). Systems react to signals
 * aimed at entities with their component. Send with `sendSignal(ctx, target, action)`.
 */
export const Signal = defineEvent<{
  target: Entity;
  action: string;
  from: Entity | undefined;
  value: number;
}>('Signal', 'A command for one entity: open, close, toggle, start, stop, spawn, on, off, ...');
