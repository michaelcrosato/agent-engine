import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';
import { LAYER_NAMES } from './layers.ts';

/**
 * A rigid body with one collider. By default the entity origin sits at the bottom-center of
 * the shape (`pivot: "bottom"`), so `pos: [x, 0, z]` rests a shape on a floor at y = 0.
 * Dynamic bodies write their pose back into Transform after each physics step; move them with
 * `ctx.physics.applyImpulse/setVelocity/teleport`, not by editing Transform.
 */
export const Body = defineComponent({
  name: 'Body',
  doc: 'Rigid body + collider (static, dynamic, or kinematic). Origin at shape bottom by default.',
  schema: {
    type: field.enum(['static', 'dynamic', 'kinematic'], 'static', { doc: 'kinematic follows Transform' }),
    shape: field.enum(['box', 'sphere', 'capsule', 'cylinder', 'cone', 'wedge'], 'box', {
      doc: 'wedge = ramp rising toward -Z (matches the wedge model part)',
    }),
    size: field.vec3([1, 1, 1], {
      doc: 'Full size in meters. sphere: x = diameter. capsule/cylinder/cone: x = diameter, y = height',
      unit: 'm',
    }),
    offset: field.vec3([0, 0, 0], { doc: 'Extra local offset of the shape', unit: 'm' }),
    pivot: field.enum(['bottom', 'center'], 'bottom', { doc: 'Where the entity origin sits on the shape' }),
    layer: field.enum(LAYER_NAMES, 'world'),
    sensor: field.bool(false, { doc: 'Overlap-only: emits TriggerEntered/TriggerExited, blocks nothing' }),
    mass: field.number(0, { min: 0, unit: 'kg', doc: '0 = density 1 (water) times volume' }),
    friction: field.number(0.6, { min: 0 }),
    restitution: field.number(0.05, { min: 0, max: 1, doc: 'Bounciness' }),
    linearDamping: field.number(0.05, { min: 0 }),
    angularDamping: field.number(0.1, { min: 0 }),
    gravityScale: field.number(1),
    lockRotation: field.bool(false, { doc: 'Prevent tipping over (dynamic only)' }),
    ccd: field.bool(false, { doc: 'Continuous collision for fast bodies' }),
    events: field.bool(false, { doc: 'Emit Contact events for this body' }),
  },
});
