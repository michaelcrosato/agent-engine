import { defineComponent, field } from '#engine/api.ts';

export const RiftField = defineComponent({
  name: 'RiftField',
  doc: 'Optional arena tools; a single vocabulary shared with elemental combat.',
  schema: {
    kind: field.enum(
      ['launch', 'barrel', 'conduit', 'chill', 'overdrive', 'vortex', 'echo', 'rift'],
      'launch',
    ),
    radius: field.number(2.5, { min: 0 }),
    cooldown: field.number(0, { doc: 'State' }),
    spent: field.bool(false, { doc: 'State' }),
  },
});
