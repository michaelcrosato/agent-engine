import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';
import { SignalSpecSchema } from './SignalSpec.ts';

/** Fires onFire after `seconds` once started ("start"/"stop" signals, or autostart). */
export const Timer = defineComponent({
  name: 'Timer',
  doc: 'Delayed or repeating signals (wave spawns, timed doors, countdowns).',
  schema: {
    seconds: field.number(1, { min: 0, unit: 's' }),
    repeat: field.bool(false),
    autostart: field.bool(false),
    onFire: field.list(SignalSpecSchema, []),
    running: field.bool(false, { doc: 'State' }),
    left: field.number(0, { doc: 'State: seconds until firing' }),
    started: field.bool(false, { doc: 'State: autostart handled' }),
  },
});
