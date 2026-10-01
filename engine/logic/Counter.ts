import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';
import { SignalSpecSchema } from './SignalSpec.ts';

/** Counts "add" signals (value or 1 each) and fires once when reaching `goal`. "reset" restarts. */
export const Counter = defineComponent({
  name: 'Counter',
  doc: 'Counts signals; fires onReach at the goal (e.g. "kill 3 enemies opens the door").',
  schema: {
    goal: field.int(3, { min: 1 }),
    onReach: field.list(SignalSpecSchema, []),
    count: field.int(0, { doc: 'State' }),
    done: field.bool(false, { doc: 'State: onReach already ran' }),
  },
});
