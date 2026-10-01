import { Euler, Quaternion, Vector3 } from 'three';

/**
 * Yaw helpers. Convention: yaw 0 faces -Z (forward); positive yaw turns left (counter-clockwise
 * seen from above), matching Three.js rotation about +Y.
 */

/** Yaw in degrees of a rotation (YXZ Euler y). */
export function yawOf(rot: Quaternion | { x: number; y: number; z: number; w: number }): number {
  return (new Euler().setFromQuaternion(rot as Quaternion, 'YXZ').y * 180) / Math.PI;
}

/** Quaternion for a yaw in degrees. */
export function yawQuat(deg: number): Quaternion {
  return new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (deg * Math.PI) / 180);
}

/** Yaw in degrees that faces along a direction's XZ projection. */
export function yawToward(dir: { x: number; z: number }): number {
  return (Math.atan2(-dir.x, -dir.z) * 180) / Math.PI;
}

/** Wraps degrees into [-180, 180). */
export function wrap180(d: number): number {
  return ((((d + 180) % 360) + 360) % 360) - 180;
}

/** Moves `from` toward `to` (degrees) by at most `maxStep`, the short way around. */
export function turnToward(from: number, to: number, maxStep: number): number {
  const d = wrap180(to - from);
  return from + Math.max(-maxStep, Math.min(maxStep, d));
}
