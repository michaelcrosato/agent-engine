import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';
import { PartSchema } from './Part.ts';

/**
 * What an entity looks like: a puppet id, or inline parts for one-off shapes.
 * Purely visual; it is ignored headless except by tools that render.
 */
export const Model = defineComponent({
  name: 'Model',
  doc: 'Visual model: a puppet (data/puppets) or inline primitive parts.',
  schema: {
    puppet: field.ref('puppet', '', { doc: 'Puppet id; empty to use inline parts' }),
    parts: field.list(PartSchema, [], { doc: 'Inline parts (used when puppet is empty)' }),
    tint: field.string('', { doc: 'Hex color multiplied into every part, e.g. "#ff8080"' }),
    visible: field.bool(true),
    filterGroup: field.enum(['environment', 'subject'], 'subject', {
      doc: 'Visual filter category: environment for terrain/buildings, subject for characters/objects',
    }),
  },
});
