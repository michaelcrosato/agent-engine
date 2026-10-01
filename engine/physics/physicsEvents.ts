import { defineEvent } from '../core/defineEvent.ts';
import type { Entity } from '../core/World.ts';

/** A sensor (Body.sensor) started overlapping another collider. */
export const TriggerEntered = defineEvent<{ trigger: Entity; other: Entity }>(
  'TriggerEntered',
  'A sensor body started overlapping another body or character.',
);

/** A sensor stopped overlapping another collider. */
export const TriggerExited = defineEvent<{ trigger: Entity; other: Entity }>(
  'TriggerExited',
  'A sensor body stopped overlapping another body or character.',
);

/** Two solid bodies started (or stopped) touching. Only for bodies with `events: true`. */
export const Contact = defineEvent<{ a: Entity; b: Entity; started: boolean }>(
  'Contact',
  'Two solid bodies started or stopped touching (requires Body.events on one of them).',
);
