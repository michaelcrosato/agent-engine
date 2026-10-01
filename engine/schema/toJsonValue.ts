import { Euler, MathUtils, Quaternion, Vector2, Vector3 } from 'three';

const round = (n: number, places: number): number => {
  const f = 10 ** places;
  const r = Math.round(n * f) / f;
  return Object.is(r, -0) ? 0 : r;
};

/** Converts a quaternion to `[x, y, z]` Euler degrees (YXZ), or a yaw number when x = z = 0. */
export function quatToJson(q: Quaternion, places = 2): number | [number, number, number] {
  const e = new Euler().setFromQuaternion(q, 'YXZ');
  const x = round(MathUtils.radToDeg(e.x), places);
  const y = round(MathUtils.radToDeg(e.y), places);
  const z = round(MathUtils.radToDeg(e.z), places);
  return x === 0 && z === 0 ? y : [x, y, z];
}

/**
 * Converts runtime component data back to its JSON form: Vector3 → [x,y,z],
 * Quaternion → Euler degrees, numbers rounded. Used by captures, the editor, and tools.
 */
export function toJsonValue(v: unknown, places = 3): unknown {
  if (typeof v === 'number') return Number.isFinite(v) ? round(v, places) : String(v);
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Vector3) return [round(v.x, places), round(v.y, places), round(v.z, places)];
  if (v instanceof Vector2) return [round(v.x, places), round(v.y, places)];
  if (v instanceof Quaternion) return quatToJson(v, Math.min(places, 2));
  if (Array.isArray(v)) return v.map((x) => toJsonValue(x, places));
  if (v instanceof Map)
    return Object.fromEntries([...v].map(([k, x]) => [String(k), toJsonValue(x, places)]));
  if (v instanceof Set) return [...v].map((x) => toJsonValue(x, places));
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    if (typeof x === 'function') continue;
    out[k] = toJsonValue(x, places);
  }
  return out;
}
