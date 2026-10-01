import { field } from '../schema/field.ts';
import { defineComponent } from './defineComponent.ts';

/**
 * Position, rotation, and scale of an entity in world space (no parenting).
 * JSON: `"pos": [x, y, z]`, `"rot": yawDegrees | [x, y, z]` (Euler degrees, YXZ), `"scale": n | [x, y, z]`.
 * Runtime: `pos`/`scale` are THREE.Vector3, `rot` is a THREE.Quaternion.
 */
export const Transform = defineComponent({
  name: 'Transform',
  doc: 'World-space position, rotation (quaternion), and scale.',
  schema: {
    pos: field.vec3([0, 0, 0], { doc: 'Position in meters', unit: 'm' }),
    rot: field.rot(0, { doc: 'Yaw degrees, or [x, y, z] Euler degrees (YXZ)' }),
    scale: field.vec3(1, { doc: 'Scale; a number scales uniformly' }),
  },
});
