import { defineComponent, field } from '#engine/api.ts';

/** __doc__ */
export const __Name__ = defineComponent({
  name: '__Name__',
  doc: '__doc__',
  schema: {
    speed: field.number(1, { min: 0, unit: 'm/s', doc: 'Example tuning field: rename or replace' }),
    timer: field.number(0, { doc: 'State: example field written by the system' }),
  },
});
