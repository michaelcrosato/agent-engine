import { z } from 'zod';
import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/** Spawns prefabs on "spawn" signals and/or every `interval` seconds, keeping at most `max` alive. */
export const Spawner = defineComponent({
  name: 'Spawner',
  doc: 'Spawns prefabs (enemy waves, item drops) on signal or timer, with caps.',
  schema: {
    prefab: field.ref('prefab', ''),
    count: field.int(1, { min: 1, doc: 'Spawned per trigger' }),
    interval: field.number(0, { min: 0, unit: 's', doc: '0 = only on "spawn" signals' }),
    active: field.bool(true, { doc: 'Interval spawning on ("start"/"stop" signals)' }),
    max: field.int(8, { min: 1, doc: 'Max alive from this spawner' }),
    total: field.int(0, { min: 0, doc: 'Lifetime cap (0 = unlimited)' }),
    radius: field.number(0, { min: 0, unit: 'm', doc: 'Random horizontal offset' }),
    effect: field.ref('effect', '', { doc: 'Effect at each spawn' }),
    spawned: field.int(0, { doc: 'State: total spawned' }),
    alive: field.list(z.number(), [], { doc: 'State: living spawned entities' }),
    next: field.number(0, { doc: 'State: sim time of the next interval spawn' }),
  },
});
