import {
  BoxGeometry,
  type BufferGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import type { PartData } from '../../model/Part.ts';
import { wedgeGeometry } from './wedgeGeometry.ts';

type V3 = [number, number, number];

/** Normalizes a vec3 input (number or tuple) to a tuple. */
export function v3(v: number | readonly number[]): V3 {
  return typeof v === 'number' ? [v, v, v] : [v[0]!, v[1]!, v[2]!];
}

/**
 * Geometry for a part, centered on its own bounding box. Returns the geometry plus a scale
 * to apply to the mesh (spheres and tori stretch to the requested size).
 */
export function partGeometry(p: PartData): { geometry: BufferGeometry; scale: V3 } {
  const [sx, sy, sz] = v3(p.size);
  const seg = p.segments;
  switch (p.shape) {
    case 'sphere':
      return { geometry: new SphereGeometry(0.5, seg, Math.max(6, seg / 2)), scale: [sx, sy, sz] };
    case 'capsule': {
      const r = sx / 2;
      return {
        geometry: new CapsuleGeometry(r, Math.max(0.001, sy - 2 * r), Math.max(2, seg / 4), seg),
        scale: [1, 1, sz / sx],
      };
    }
    case 'cylinder':
      return { geometry: new CylinderGeometry(sx / 2, sx / 2, sy, seg), scale: [1, 1, sz / sx] };
    case 'cone':
      return { geometry: new ConeGeometry(sx / 2, sy, seg), scale: [1, 1, sz / sx] };
    case 'torus': {
      const tube = p.thickness / 2;
      const g = new TorusGeometry(sx / 2 - tube, tube, Math.max(6, seg / 2), seg);
      g.rotateX(Math.PI / 2);
      return { geometry: g, scale: [1, 1, 1] };
    }
    case 'plane':
      return { geometry: new PlaneGeometry(sx, sy), scale: [1, 1, 1] };
    case 'wedge':
      return { geometry: wedgeGeometry(sx, sy, sz), scale: [1, 1, 1] };
    case 'lathe': {
      const pts = (
        p.profile.length
          ? p.profile
          : [
              [0.3, 0],
              [0.5, 0.5],
              [0.3, 1],
            ]
      ).map(([r, y]) => new Vector2(r, y));
      const g = new LatheGeometry(pts, seg);
      g.computeBoundingBox();
      const bb = g.boundingBox!;
      g.translate(0, -(bb.min.y + bb.max.y) / 2, 0);
      return {
        geometry: g,
        scale: [
          sx / Math.max(1e-6, bb.max.x * 2),
          sy / Math.max(1e-6, bb.max.y - bb.min.y),
          sz / Math.max(1e-6, bb.max.z * 2),
        ],
      };
    }
    case 'extrude': {
      const pts = p.points.length
        ? p.points
        : [
            [-0.5, -0.5],
            [0.5, -0.5],
            [0, 0.5],
          ];
      const shape = new Shape(pts.map(([x, y]) => new Vector2(x, y)));
      const g = new ExtrudeGeometry(shape, { depth: sz, bevelEnabled: false, curveSegments: seg });
      g.computeBoundingBox();
      const bb = g.boundingBox!;
      g.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);
      return {
        geometry: g,
        scale: [sx / Math.max(1e-6, bb.max.x - bb.min.x), sy / Math.max(1e-6, bb.max.y - bb.min.y), 1],
      };
    }
    default:
      return { geometry: new BoxGeometry(sx, sy, sz), scale: [1, 1, 1] };
  }
}
