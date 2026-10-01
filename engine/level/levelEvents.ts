import { defineEvent } from '../core/defineEvent.ts';
import type { Entity } from '../core/World.ts';

export const RoomLoaded = defineEvent<{ room: string; player: Entity | undefined }>(
  'RoomLoaded',
  'A room finished loading; player is the player entity if the game has one.',
);
