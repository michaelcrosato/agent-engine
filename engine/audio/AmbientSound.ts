import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';

/** A sound emitted from an entity: a continuous loop, or repeated every `interval` seconds. */
export const AmbientSound = defineComponent({
  name: 'AmbientSound',
  doc: 'Positional looping or periodic sound (hums, drips, machinery).',
  schema: {
    sound: field.ref('sound', '', { doc: 'Sound id' }),
    volume: field.number(1, { min: 0, max: 4 }),
    interval: field.number(0, { min: 0, unit: 's', doc: '0 = loop forever; >0 = replay every interval' }),
    jitter: field.number(0.3, { min: 0, max: 1, doc: 'Random interval variation (fraction)' }),
    on: field.bool(true),
    voice: field.int(0, { doc: 'State: playing loop voice id (0 = none)' }),
    next: field.number(0, { doc: 'State: sim time of the next periodic play' }),
  },
});
