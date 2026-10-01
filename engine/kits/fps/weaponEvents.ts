import type { Vector3 } from 'three';
import { defineEvent } from '../../core/defineEvent.ts';
import type { Entity } from '../../core/World.ts';

export const WeaponFired = defineEvent<{
  shooter: Entity;
  weapon: string;
  origin: Vector3;
  dir: Vector3;
  hits: Entity[];
}>('WeaponFired', 'A weapon fired (after ammo checks). hits lists entities struck by hitscan pellets.');

export const WeaponChanged = defineEvent<{ entity: Entity; weapon: string }>(
  'WeaponChanged',
  'The active weapon changed.',
);

export const Reloaded = defineEvent<{ entity: Entity; weapon: string }>('Reloaded', 'A reload started.');
