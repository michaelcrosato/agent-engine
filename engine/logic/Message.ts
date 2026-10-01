import { defineEvent } from '../core/defineEvent.ts';

/** On-screen text for the player (HUD shows it; tests can assert it). */
export const Message = defineEvent<{ text: string; seconds: number }>(
  'Message',
  'Show a text message to the player.',
);
