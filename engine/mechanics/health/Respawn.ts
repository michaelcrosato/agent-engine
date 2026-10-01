import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/** Brings a dead entity (the player) back after `delay`: full health, room reloaded. */
export const Respawn = defineComponent({
  name: 'Respawn',
  doc: 'After death, restore health and reload the room (or just revive) after a delay.',
  schema: {
    delay: field.number(2.5, { min: 0, unit: 's' }),
    reloadRoom: field.bool(true),
    diedAt: field.number(-1, { doc: 'State: sim time of death (-1 = alive)' }),
  },
});
