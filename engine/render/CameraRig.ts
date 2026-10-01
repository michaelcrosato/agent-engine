import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';

/**
 * Puts the render camera on this entity. View = Transform rotation (yaw) then `pitch`.
 * mode "first": eye at `offset`. mode "third": orbit `distance` meters behind the eye point.
 */
export const CameraRig = defineComponent({
  name: 'CameraRig',
  doc: 'Render camera mount: first/third person, eye offset, pitch, FOV.',
  schema: {
    mode: field.enum(['first', 'third'], 'first'),
    offset: field.vec3([0, 1.6, 0], { doc: 'Eye position relative to the entity origin', unit: 'm' }),
    pitch: field.number(0, { min: -89, max: 89, unit: 'deg', doc: 'State: look up/down' }),
    distance: field.number(4, { min: 0, unit: 'm', doc: 'Third person: distance behind the eye' }),
    fov: field.number(75, { min: 20, max: 120, unit: 'deg' }),
    priority: field.int(0, { doc: 'Highest priority rig drives the camera' }),
  },
});
