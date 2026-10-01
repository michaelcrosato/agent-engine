import { defineEvent } from '../../core/defineEvent.ts';
import type { Entity } from '../../core/World.ts';

export const PickedUp = defineEvent<{
  picker: Entity;
  pickup: Entity;
  kind: string;
  item: string;
  amount: number;
}>('PickedUp', 'Something collected a Pickup (kits react to kind "weapon" and custom items).');
