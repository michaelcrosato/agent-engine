import type { Vector3 } from 'three';
import { type Engine, Model, Motion, Transform } from '#engine/api.ts';
import type { LootItem } from '../progression/Profile.ts';
import { rarityColors } from '../progression/rollLoot.ts';
import { RunKey } from '../RunState.ts';

export function spawnLoot(engine: Engine, at: Vector3, item?: LootItem, gold = 0): number {
  const w = engine.world;
  const e = w.spawn({ name: `loot-${engine.time.tick}-${w.size}`, tags: [item ? 'loot-item' : 'loot-gold'] });
  w.add(e, Transform, { pos: [at.x, Math.max(0.25, at.y + 0.3), at.z] });
  const color = item ? rarityColors[item.rarity] : '#ffd184';
  w.add(e, Model, {
    parts: [
      {
        shape: item ? 'box' : 'sphere',
        size: item ? [0.45, 0.22, 0.7] : 0.22,
        material: 'white-glow',
        color,
      },
      {
        shape: 'cylinder',
        size: [0.025, item ? 3.2 : 0.7, 0.025],
        material: 'white-glow',
        color,
        shadow: false,
      },
      {
        shape: 'torus',
        size: [0.7, 0.7, 0.05],
        thickness: 0.025,
        material: 'white-glow',
        color,
        pivot: 'center',
        shadow: false,
      },
    ],
  });
  w.add(e, Motion, { bob: 0.09, bobRate: 1.2, spin: [0, 40, 0] });
  if (item) engine.service(RunKey).drops.set(e, item);
  else w.tag(e, `gold:${Math.round(gold)}`);
  return e;
}
