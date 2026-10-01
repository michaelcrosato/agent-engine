import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/** Lets an entity (the player) use Interactables it looks at. `focus` is what the HUD prompts. */
export const Interactor = defineComponent({
  name: 'Interactor',
  doc: 'Looks for Interactables along the view ray; "use" action activates the focused one.',
  schema: {
    action: field.string('use', { doc: 'Input action that uses the focused Interactable' }),
    reach: field.number(3, { min: 0.5, unit: 'm' }),
    focus: field.int(-1, { doc: 'State: focused Interactable entity (-1 = none)' }),
    prompt: field.string('', { doc: 'State: prompt text of the focus' }),
  },
});
