import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { Transform } from '../core/Transform.ts';
import type { Entity, World } from '../core/World.ts';
import { CameraRig } from './CameraRig.ts';

const pitchQ = new Quaternion();

/**
 * Eye position and look direction of an entity: Transform yaw plus CameraRig pitch and offset.
 * Works headless (used by weapons, interaction, AI, and the harness).
 */
export function viewRay(world: World, e: Entity): { origin: Vector3; dir: Vector3 } {
  const t = world.need(e, Transform, 'viewRay');
  const rig = world.get(e, CameraRig);
  const origin = (rig?.offset.clone() ?? new Vector3(0, 1.6, 0)).applyQuaternion(t.rot).add(t.pos);
  pitchQ.setFromEuler(new Euler(MathUtils.degToRad(rig?.pitch ?? 0), 0, 0, 'YXZ'));
  const dir = new Vector3(0, 0, -1).applyQuaternion(t.rot.clone().multiply(pitchQ)).normalize();
  return { origin, dir };
}
