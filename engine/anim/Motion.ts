import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';

/** Simple procedural motion for props: constant spin and vertical bobbing. */
export const Motion = defineComponent({
  name: 'Motion',
  doc: 'Spins (deg/s per axis) and bobs (meters, Hz) an entity, e.g. pickups.',
  schema: {
    spin: field.vec3([0, 0, 0], { unit: 'deg/s', doc: 'Rotation speed around x, y, z' }),
    bob: field.number(0, { min: 0, unit: 'm', doc: 'Bob height (0 = none)' }),
    bobRate: field.number(0.5, { min: 0, unit: 'Hz' }),
    baseY: field.number(0, { doc: 'State: resting height (captured on first tick)' }),
    started: field.bool(false, { doc: 'State: baseY captured' }),
  },
});
