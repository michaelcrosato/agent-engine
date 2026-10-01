import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';

/** A text sign floating at the entity (browser only; system fonts, no assets). */
export const Label = defineComponent({
  name: 'Label',
  doc: '3D text sign: a lit-independent panel with text, optionally facing the camera.',
  schema: {
    text: field.string('Label', { doc: 'Use \\n for multiple lines' }),
    size: field.number(0.4, { min: 0.05, unit: 'm', doc: 'Line height' }),
    color: field.color('#ffffff'),
    background: field.color('#141a22'),
    opacity: field.number(0.8, { min: 0, max: 1, doc: 'Background opacity (0 = text only)' }),
    offset: field.vec3([0, 2.6, 0], { unit: 'm' }),
    billboard: field.bool(false, { doc: 'Always face the camera' }),
  },
});
