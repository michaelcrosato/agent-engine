import { defineComponent } from '../../core/defineComponent.ts';
import { SignalSpecSchema } from '../../logic/SignalSpec.ts';
import { field } from '../../schema/field.ts';

/** Something the player can look at and "use" (buttons, levers, terminals). */
export const Interactable = defineComponent({
  name: 'Interactable',
  doc: 'Look-and-use target: shows a prompt and runs onUse signals when used.',
  schema: {
    prompt: field.string('Use'),
    range: field.number(2.5, { min: 0.5, unit: 'm' }),
    onUse: field.list(SignalSpecSchema, []),
    once: field.bool(false),
    cooldown: field.number(0.5, { min: 0, unit: 's' }),
    sound: field.ref('sound', 'button'),
    uses: field.int(0, { doc: 'State' }),
    lastUse: field.number(-999, { doc: 'State' }),
  },
});
