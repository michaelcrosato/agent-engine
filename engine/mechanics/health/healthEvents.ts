import type { Vector3 } from 'three';
import { defineEvent } from '../../core/defineEvent.ts';
import type { Entity } from '../../core/World.ts';

export type DamageKind = 'bullet' | 'explosion' | 'melee' | 'hazard' | 'fall' | 'other';

export const Damaged = defineEvent<{
  entity: Entity;
  amount: number;
  from: Entity | undefined;
  kind: DamageKind;
  point: Vector3 | undefined;
}>('Damaged', 'An entity with Health lost hit points.');

export const Died = defineEvent<{ entity: Entity; from: Entity | undefined; kind: DamageKind }>(
  'Died',
  'An entity with Health reached 0 hit points.',
);

export const Healed = defineEvent<{ entity: Entity; amount: number }>(
  'Healed',
  'An entity with Health gained hit points.',
);
