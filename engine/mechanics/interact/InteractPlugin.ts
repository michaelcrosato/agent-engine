import { definePlugin } from '../../core/definePlugin.ts';
import { Interactable } from './Interactable.ts';
import { Interactor } from './Interactor.ts';
import { InteractSystem, Used } from './InteractSystem.ts';

/** Look-and-use interaction: buttons, levers, terminals. */
export const InteractPlugin = definePlugin({
  name: 'interact',
  doc: 'Interactor (player) + Interactable (buttons, levers) with onUse signals.',
  components: [Interactable, Interactor],
  systems: [InteractSystem],
  events: [Used],
  requires: ['logic'],
});
