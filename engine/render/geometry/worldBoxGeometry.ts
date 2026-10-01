import { BoxGeometry } from 'three';

/**
 * A box whose UVs are in meters / tile, offset by its world position, so textures tile
 * continuously across separate level blocks (no stretching on long walls).
 */
export function worldBoxGeometry(
  w: number,
  h: number,
  d: number,
  tile: number,
  origin: { x: number; y: number; z: number },
): BoxGeometry {
  const g = new BoxGeometry(w, h, d);
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + origin.x;
    const y = pos.getY(i) + origin.y + h / 2;
    const z = pos.getZ(i) + origin.z;
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    let u: number;
    let v: number;
    if (ay > 0.5) {
      u = x;
      v = -z;
    } else if (ax > 0.5) {
      u = nor.getX(i) > 0 ? -z : z;
      v = y;
    } else {
      u = nor.getZ(i) > 0 ? x : -x;
      v = y;
    }
    uv.setXY(i, u / tile, v / tile);
  }
  uv.needsUpdate = true;
  return g;
}
