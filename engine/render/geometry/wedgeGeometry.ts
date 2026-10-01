import { BufferGeometry, Float32BufferAttribute } from 'three';

/**
 * A ramp: full height at -Z (back), zero at +Z (front); centered on the origin like a box.
 * Walk up it toward -Z (the engine's forward).
 */
export function wedgeGeometry(w: number, h: number, d: number): BufferGeometry {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const p = {
    a: [-x, -y, z],
    b: [x, -y, z],
    c: [x, -y, -z],
    d: [-x, -y, -z],
    e: [-x, y, -z],
    f: [x, y, -z],
  };
  const tris: [number[], number[], number[]][] = [
    [p.a, p.c, p.b],
    [p.a, p.d, p.c],
    [p.d, p.e, p.f],
    [p.d, p.f, p.c],
    [p.a, p.b, p.f],
    [p.a, p.f, p.e],
    [p.a, p.e, p.d],
    [p.b, p.c, p.f],
  ];
  const pos: number[] = [];
  const uv: number[] = [];
  for (const t of tris) {
    for (const v of t) pos.push(...(v as [number, number, number]));
    uv.push(0, 0, 1, 0, 1, 1);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
