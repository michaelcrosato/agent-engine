import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/**
 * First-person movement for an entity with CharacterBody + CameraRig. Reads actions
 * moveForward/moveBack/moveLeft/moveRight/jump/sprint/crouch and look input
 * (yaw -= look.x, pitch += look.y, exactly, so bots and tests can aim precisely).
 */
export const FpsController = defineComponent({
  name: 'FpsController',
  doc: 'First-person walking, sprinting, crouching, jumping, looking; rides moving platforms.',
  schema: {
    walkSpeed: field.number(6.5, { min: 0, unit: 'm/s' }),
    sprintSpeed: field.number(10, { min: 0, unit: 'm/s' }),
    crouchSpeed: field.number(3, { min: 0, unit: 'm/s' }),
    accel: field.number(60, { min: 0, unit: 'm/s²', doc: 'Ground acceleration toward the wished velocity' }),
    airAccel: field.number(14, { min: 0, unit: 'm/s²' }),
    jumpSpeed: field.number(7.2, { min: 0, unit: 'm/s' }),
    gravity: field.number(22, { min: 0, unit: 'm/s²' }),
    maxFall: field.number(45, { min: 0, unit: 'm/s' }),
    coyoteTime: field.number(0.12, {
      min: 0,
      unit: 's',
      doc: 'Jump still allowed this long after leaving ground',
    }),
    jumpBuffer: field.number(0.12, {
      min: 0,
      unit: 's',
      doc: 'Jump pressed this early still counts on landing',
    }),
    eyeHeight: field.number(1.6, { min: 0.2, unit: 'm' }),
    crouchEye: field.number(0.95, { min: 0.2, unit: 'm' }),
    stepDistance: field.number(2.3, { min: 0.1, unit: 'm', doc: 'Meters per footstep sound' }),
    fallDamage: field.number(0, { min: 0, doc: 'Damage per m/s of landing speed above 16 m/s' }),
    footstepSound: field.ref('sound', 'step'),
    jumpSound: field.ref('sound', 'jump'),
    landSound: field.ref('sound', 'land'),
    coyote: field.number(0, { doc: 'State' }),
    buffered: field.number(0, { doc: 'State' }),
    stepAcc: field.number(0, { doc: 'State: meters since the last footstep' }),
    wasGrounded: field.bool(true, { doc: 'State' }),
    lastFallSpeed: field.number(0, { doc: 'State: vertical speed just before landing' }),
    landKick: field.number(0, { doc: 'Output: landing impact 0..1 (camera dip)' }),
    bobPhase: field.number(0, { doc: 'Output: head-bob phase (radians)' }),
    crouching: field.bool(false, { doc: 'State' }),
  },
});
