import { type BufferGeometry, Euler, Group, MathUtils, Mesh, type Object3D } from 'three';
import { EngineError } from '../core/EngineError.ts';
import { type Part, PartSchema } from '../model/Part.ts';
import { partGeometry, v3 } from './geometry/partGeometry.ts';
import { worldBoxGeometry } from './geometry/worldBoxGeometry.ts';
import type { MaterialLibrary } from './MaterialLibrary.ts';

/** A built model: the root to add to the scene, and named joints for animation. */
export type PuppetInstance = {
  root: Group;
  /** Part id → joint (the part's pivot transform). Animation clips drive these. */
  joints: Map<string, Object3D>;
  /** Rest pose of every joint, so clips can be applied as offsets. */
  rest: Map<
    string,
    { pos: [number, number, number]; rot: [number, number, number]; scale: [number, number, number] }
  >;
};

type SharedGeometry = { geometry: BufferGeometry; scale: [number, number, number]; users: number };
const geometryCache = new Map<string, SharedGeometry>();

function cachedGeometry(p: Part) {
  const key = JSON.stringify([p.shape, p.size, p.segments, p.profile, p.points, p.thickness]);
  let g = geometryCache.get(key);
  if (!g) {
    g = { ...partGeometry(p), users: 0 };
    g.geometry.userData.sharedKey = key;
    geometryCache.set(key, g);
  }
  g.users++;
  return g;
}

export type BuildOpts = {
  materials: MaterialLibrary;
  tint?: string;
  /** World position of the model origin (for parts with uv: "world"). */
  origin?: { x: number; y: number; z: number };
  /** Material tile size lookup for world UVs (meters per texture tile). */
  tileOf?: (material: string) => number;
  where?: string;
};

/** Builds Three objects for a list of parts (puppet or inline Model parts). */
export function buildPuppet(rawParts: readonly unknown[], opts: BuildOpts): PuppetInstance {
  const root = new Group();
  const joints = new Map<string, Object3D>();
  const rest: PuppetInstance['rest'] = new Map();
  rawParts.forEach((raw, i) => {
    const p = PartSchema.parse(raw);
    const joint = new Group();
    joint.name = p.id || `part${i}`;
    const [px, py, pz] = v3(p.pos);
    const [rx, ry, rz] = typeof p.rot === 'number' ? [0, p.rot, 0] : v3(p.rot);
    const [kx, ky, kz] = v3(p.scale);
    joint.position.set(px, py, pz);
    joint.quaternion.setFromEuler(
      new Euler(MathUtils.degToRad(rx), MathUtils.degToRad(ry), MathUtils.degToRad(rz), 'YXZ'),
    );
    joint.scale.set(kx, ky, kz);
    if (!p.hidden) {
      const [, sy] = v3(p.size);
      const lift = p.pivot === 'bottom' ? sy / 2 : p.pivot === 'top' ? -sy / 2 : 0;
      const material = opts.materials.get(p.material, p.color ?? opts.tint);
      let mesh: Mesh;
      if (p.uv === 'world' && p.shape === 'box' && opts.origin) {
        const [sx, , sz] = v3(p.size);
        const o = opts.origin;
        const geo = worldBoxGeometry(sx, sy, sz, opts.tileOf?.(p.material) ?? 2, {
          x: o.x + px,
          y: o.y + py,
          z: o.z + pz,
        });
        mesh = new Mesh(geo, material);
        mesh.userData.ownsGeometry = true;
      } else {
        const g = cachedGeometry(p);
        mesh = new Mesh(g.geometry, material);
        mesh.scale.set(...g.scale);
      }
      mesh.position.y = lift;
      mesh.castShadow = p.shadow;
      mesh.receiveShadow = true;
      joint.add(mesh);
    }
    const parent = p.parent ? joints.get(p.parent) : root;
    if (!parent) {
      throw new EngineError({
        code: 'PUPPET_PARENT_MISSING',
        what: `Part "${p.id || i}" has parent "${p.parent}", which is not defined before it`,
        where: { path: `$.parts[${i}].parent`, ...(opts.where ? { file: opts.where } : {}) },
        fix: 'List parent parts before their children, and check the parent id spelling.',
      });
    }
    parent.add(joint);
    if (p.id) {
      joints.set(p.id, joint);
      rest.set(p.id, { pos: [px, py, pz], rot: [rx, ry, rz], scale: [kx, ky, kz] });
    }
  });
  return { root, joints, rest };
}

/** Release geometry when its last live instance leaves. Procedural variants cannot grow the cache forever. */
export function disposePuppet(inst: PuppetInstance): void {
  if (inst.root.userData.disposed) return;
  inst.root.userData.disposed = true;
  inst.root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    if (o.userData.ownsGeometry) o.geometry.dispose();
    else {
      const key = o.geometry.userData.sharedKey as string;
      const shared = geometryCache.get(key);
      if (shared && --shared.users === 0) {
        shared.geometry.dispose();
        geometryCache.delete(key);
      }
    }
  });
}
