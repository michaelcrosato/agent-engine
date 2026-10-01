import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';

/** A dynamic light attached to an entity. Rendered in the browser only. */
export const Light = defineComponent({
  name: 'Light',
  doc: 'Point or spot light at the entity (plus offset); optional flicker/pulse.',
  schema: {
    type: field.enum(['point', 'spot'], 'point'),
    color: field.color('#ffe6c4'),
    intensity: field.number(30, { min: 0, doc: 'Candela-like; ~20-80 lights a room corner' }),
    range: field.number(12, { min: 0, unit: 'm', doc: 'Distance where light fades to zero (0 = infinite)' }),
    offset: field.vec3([0, 0, 0], { unit: 'm' }),
    shadows: field.bool(false, { doc: 'Costly: use on a few key lights only' }),
    angle: field.number(40, { min: 1, max: 89, unit: 'deg', doc: 'Spot cone half-angle' }),
    aim: field.vec3([0, -1, 0], { doc: 'Spot direction (world space)' }),
    flicker: field.number(0, { min: 0, max: 1, doc: 'Random flicker amount' }),
    pulse: field.number(0, { min: 0, unit: 'Hz', doc: 'Smooth pulsing rate' }),
    on: field.bool(true, { doc: 'Toggle with the "toggle"/"on"/"off" signals' }),
  },
});
