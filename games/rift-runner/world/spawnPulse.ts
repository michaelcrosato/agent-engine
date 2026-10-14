import type { Vector3 } from 'three';
import { AreaPulse, type Engine, Model, Transform } from '#engine/api.ts';

export function spawnPulse(
  engine: Engine,
  at: Vector3,
  owner: number,
  radius: number,
  damage: number,
  delay: number,
  targetTag = 'enemy',
  element: 'fire' | 'frost' | 'shock' | 'kinetic' = 'shock',
): number {
  const w = engine.world;
  const e = w.spawn({ tags: ['telegraph'] });
  w.add(e, Transform, { pos: [at.x, Math.max(0.09, at.y + 0.04), at.z] });
  w.add(e, Model, {
    parts: [
      {
        shape: 'torus',
        size: [radius * 2, radius * 2, 0.08],
        thickness: 0.08,
        pivot: 'center',
        material: targetTag === 'player' ? 'danger' : 'cyan',
        shadow: false,
      },
      {
        shape: 'cylinder',
        size: [radius * 2, 0.02, radius * 2],
        material: targetTag === 'player' ? 'danger' : 'pad',
        segments: 32,
        shadow: false,
      },
    ],
  });
  w.add(e, AreaPulse, { owner, radius, damage, delay, targetTag, element, effect: 'rift-burst' });
  return e;
}
