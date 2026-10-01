import { definePlugin } from '../../core/definePlugin.ts';
import { Inventory } from './Inventory.ts';
import { Pickup } from './Pickup.ts';
import { PickupSystem } from './PickupSystem.ts';
import { PickedUp } from './pickupEvents.ts';

/** Pickups and the Inventory they fill (keys, ammo, items). */
export const PickupsPlugin = definePlugin({
  name: 'pickups',
  doc: 'Pickup (health, armor, ammo, weapon, key, item) and Inventory.',
  components: [Pickup, Inventory],
  systems: [PickupSystem],
  events: [PickedUp],
  requires: ['health'],
});
