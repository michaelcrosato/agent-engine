import type { ContentStore } from '../../content/ContentStore.ts';
import type { ComponentData } from '../../core/defineComponent.ts';
import { EngineError } from '../../core/EngineError.ts';
import { resolvePrefab } from '../../prefab/resolvePrefab.ts';
import { Weapon } from './Weapon.ts';

export type WeaponData = ComponentData<typeof Weapon>;

const cache = new WeakMap<ContentStore, Map<string, { raw: unknown; data: WeaponData }>>();

/** Weapon stats of a weapon prefab id (validated; cached until the prefab JSON changes). */
export function weaponData(content: ContentStore, id: string): WeaponData {
  let byId = cache.get(content);
  if (!byId) cache.set(content, (byId = new Map()));
  const raw = content.entry('prefab', id)?.raw;
  const hit = byId.get(id);
  if (hit && hit.raw === raw) return hit.data;
  const comps = resolvePrefab(content, id).components;
  if (!comps.Weapon) {
    throw new EngineError({
      code: 'WEAPON_NOT_A_WEAPON',
      what: `Prefab "${id}" is used as a weapon but has no Weapon component`,
      where: { file: content.entry('prefab', id)?.file },
      fix: 'Add "Weapon": { ... } to its components, or fix the pickup item / Arsenal entry.',
    });
  }
  const data = Weapon.create(comps.Weapon, {
    file: content.entry('prefab', id)?.file,
    path: '$.components.Weapon',
  });
  byId.set(id, { raw, data });
  return data;
}
