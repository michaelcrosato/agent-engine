import { definePlugin } from '../../core/definePlugin.ts';
import { Traversal } from './Traversal.ts';
import { TraversalSystem } from './TraversalSystem.ts';

export const ActionPlugin = definePlugin({
  name: 'action',
  doc: 'Third/first-person action traversal with matching puppet animation states.',
  requires: ['fps'],
  components: [Traversal],
  systems: [TraversalSystem],
});
