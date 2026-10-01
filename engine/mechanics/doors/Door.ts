import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/**
 * Opens when the player comes near (or on "open" signals), optionally requiring a key from
 * their Inventory. Motion comes from the entity's Mover (points[0] = closed, last = open).
 */
export const Door = defineComponent({
  name: 'Door',
  doc: 'Proximity/signal door with optional key; moves via its Mover.',
  schema: {
    key: field.string('', { doc: 'Inventory key needed ("" = unlocked)' }),
    auto: field.bool(true, { doc: 'Open when a player is within radius' }),
    radius: field.number(3.5, { min: 0, unit: 'm' }),
    closeDelay: field.number(2, { min: 0, unit: 's', doc: 'Seconds after everyone leaves; 0 = stays open' }),
    openSound: field.ref('sound', 'door-open'),
    closeSound: field.ref('sound', 'door-close'),
    lockedMessage: field.string('Locked. Needs the {key} key.'),
    open: field.bool(false, { doc: 'State' }),
    lastNear: field.number(-999, { doc: 'State: sim time a player was last near' }),
    lastNag: field.number(-999, { doc: 'State: sim time of the last locked message' }),
  },
});
