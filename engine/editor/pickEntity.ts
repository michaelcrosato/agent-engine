import { type Camera, type Object3D, Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { Entity } from '../core/World.ts';

export type Pick = { entity: Entity | undefined; point: Vector3; normal: Vector3 };

const ray = new Raycaster();
const GROUND = new Plane(new Vector3(0, 1, 0), 0);

function entityOf(o: Object3D | null): Entity | undefined {
  for (let cur = o; cur; cur = cur.parent) {
    if (cur.userData.entity !== undefined) return cur.userData.entity as Entity;
    if (cur.userData.editorIgnore) return undefined;
  }
  return undefined;
}

/**
 * What is under a canvas point: the nearest object that belongs to an entity (models, labels,
 * editor markers), else the ground plane y = 0. `clientX/Y` are page coordinates.
 */
export function pickEntity(
  camera: Camera,
  roots: readonly Object3D[],
  canvas: HTMLElement,
  clientX: number,
  clientY: number,
): Pick | undefined {
  const rect = canvas.getBoundingClientRect();
  const ndc = new Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  ray.setFromCamera(ndc, camera);
  for (const hit of ray.intersectObjects(roots as Object3D[], true)) {
    if (!hit.object.visible) continue;
    const entity = entityOf(hit.object);
    if (entity === undefined) continue;
    const normal =
      hit.face?.normal.clone().transformDirection(hit.object.matrixWorld) ?? new Vector3(0, 1, 0);
    return { entity, point: hit.point.clone(), normal };
  }
  const point = ray.ray.intersectPlane(GROUND, new Vector3());
  return point ? { entity: undefined, point, normal: new Vector3(0, 1, 0) } : undefined;
}
