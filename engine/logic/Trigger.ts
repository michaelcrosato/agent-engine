import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';
import { SignalSpecSchema } from './SignalSpec.ts';

/**
 * Runs signal specs when something enters/leaves this entity's sensor (needs a Body with
 * `sensor: true`, e.g. layer "trigger"). Data-only level scripting.
 */
export const Trigger = defineComponent({
  name: 'Trigger',
  doc: 'Sensor volume that sends signals/messages on enter and exit.',
  schema: {
    filter: field.string('player', { doc: '"player", "any", or a tag the entering entity must have' }),
    onEnter: field.list(SignalSpecSchema, [], { doc: 'Signals/messages when a matching entity enters' }),
    onExit: field.list(SignalSpecSchema, [], { doc: 'Signals/messages when it leaves' }),
    once: field.bool(false, { doc: 'Only fire the first time' }),
    fired: field.int(0, { doc: 'State: times onEnter ran' }),
    inside: field.int(0, { doc: 'State: matching entities inside now' }),
  },
});
