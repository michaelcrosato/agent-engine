import RAPIER from '@dimforge/rapier3d-simd-compat';
import { Vector3 } from 'three';
import type { ComponentData } from '../core/defineComponent.ts';
import type { Transform } from '../core/Transform.ts';
import type { Entity } from '../core/World.ts';
import type { Body } from './Body.ts';
import type { CharacterBody } from './CharacterBody.ts';
import { layerGroups } from './layers.ts';

/** Rapier objects owned by one entity. */
export type PhysicsHandle = {
  entity: Entity;
  kind: 'body' | 'character';
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  kcc?: RAPIER.KinematicCharacterController;
};

type BodyData = ComponentData<typeof Body>;
type TransformData = ComponentData<typeof Transform>;

/** Half-height of a shape along Y (used to lift bottom-pivot shapes). */
function halfHeight(b: BodyData): number {
  return b.shape === 'sphere' ? b.size.x / 2 : b.size.y / 2;
}

function shapeDesc(b: BodyData): RAPIER.ColliderDesc {
  const s = b.size;
  const r = s.x / 2;
  switch (b.shape) {
    case 'sphere':
      return RAPIER.ColliderDesc.ball(r);
    case 'capsule':
      return RAPIER.ColliderDesc.capsule(Math.max(0.001, s.y / 2 - r), r);
    case 'cylinder':
      return RAPIER.ColliderDesc.cylinder(s.y / 2, r);
    case 'cone':
      return RAPIER.ColliderDesc.cone(s.y / 2, r);
    default:
      return RAPIER.ColliderDesc.cuboid(s.x / 2, s.y / 2, s.z / 2);
  }
}

/** Builds a rigid body + collider from a Body component at the entity's Transform. */
export function createBodyHandle(
  world: RAPIER.World,
  e: Entity,
  b: BodyData,
  t: TransformData,
): PhysicsHandle {
  const desc =
    b.type === 'dynamic'
      ? RAPIER.RigidBodyDesc.dynamic()
      : b.type === 'kinematic'
        ? RAPIER.RigidBodyDesc.kinematicPositionBased()
        : RAPIER.RigidBodyDesc.fixed();
  desc.setTranslation(t.pos.x, t.pos.y, t.pos.z).setRotation(t.rot);
  if (b.type === 'dynamic') {
    desc
      .setLinearDamping(b.linearDamping)
      .setAngularDamping(b.angularDamping)
      .setGravityScale(b.gravityScale);
    desc.setCcdEnabled(b.ccd);
    if (b.lockRotation) desc.lockRotations();
  }
  const body = world.createRigidBody(desc);
  body.userData = e;
  const center = new Vector3().copy(b.offset);
  if (b.pivot === 'bottom') center.y += halfHeight(b);
  const cd = shapeDesc(b)
    .setTranslation(center.x, center.y, center.z)
    .setFriction(b.friction)
    .setRestitution(b.restitution)
    .setSensor(b.sensor)
    .setCollisionGroups(layerGroups(b.layer));
  if (b.mass > 0) cd.setMass(b.mass);
  if (b.sensor || b.events) cd.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  if (b.sensor) cd.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
  const collider = world.createCollider(cd, body);
  return { entity: e, kind: 'body', body, collider };
}

/** Builds a kinematic capsule + character controller from a CharacterBody component. */
export function createCharacterHandle(
  world: RAPIER.World,
  e: Entity,
  c: ComponentData<typeof CharacterBody>,
  t: TransformData,
): PhysicsHandle {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(t.pos.x, t.pos.y, t.pos.z),
  );
  body.userData = e;
  const half = Math.max(0.01, c.height / 2 - c.radius);
  const cd = RAPIER.ColliderDesc.capsule(half, c.radius)
    .setTranslation(0, c.height / 2, 0)
    .setCollisionGroups(layerGroups(c.layer))
    .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
  const collider = world.createCollider(cd, body);
  const kcc = world.createCharacterController(0.02);
  kcc.setUp({ x: 0, y: 1, z: 0 });
  kcc.setMaxSlopeClimbAngle((c.maxSlope * Math.PI) / 180);
  kcc.setMinSlopeSlideAngle(((c.maxSlope + 5) * Math.PI) / 180);
  if (c.stepHeight > 0) kcc.enableAutostep(c.stepHeight, Math.min(0.2, c.radius), true);
  if (c.snap > 0) kcc.enableSnapToGround(c.snap);
  kcc.setApplyImpulsesToDynamicBodies(c.pushProps);
  kcc.setCharacterMass(80);
  kcc.setSlideEnabled(true);
  return { entity: e, kind: 'character', body, collider, kcc };
}
