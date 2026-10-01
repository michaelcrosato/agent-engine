import { defineEvent } from '../core/defineEvent.ts';

/** Request to switch the room's look at runtime (the renderer applies it; headless just records). */
export const LookChanged = defineEvent<{ look: string }>(
  'LookChanged',
  'The room look was switched (e.g. by a button).',
);
