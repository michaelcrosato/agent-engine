import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/**
 * Collectible: needs a sensor Body (layer "pickup"). Health/armor/ammo/key/item are applied
 * here; "weapon" is announced via PickedUp for the genre kit to handle.
 */
export const Pickup = defineComponent({
  name: 'Pickup',
  doc: 'Collectible (health, armor, ammo, weapon, key, item) with optional respawn.',
  schema: {
    kind: field.enum(['health', 'armor', 'ammo', 'weapon', 'key', 'item'], 'health'),
    item: field.string('', { doc: 'Ammo type, weapon prefab id, key name, or item id' }),
    amount: field.number(25, { min: 0 }),
    respawn: field.number(0, { min: 0, unit: 's', doc: '0 = never comes back' }),
    sound: field.ref('sound', 'pickup'),
    message: field.string('', { doc: 'HUD text; {amount} and {item} are replaced' }),
    taken: field.bool(false, { doc: 'State' }),
    respawnAt: field.number(0, { doc: 'State' }),
  },
});
