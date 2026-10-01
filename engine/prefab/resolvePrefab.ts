import type { ContentStore } from '../content/ContentStore.ts';
import { EngineError, type ErrorWhere } from '../core/EngineError.ts';
import { deepMerge } from './deepMerge.ts';
import { PrefabKind } from './Prefab.ts';

export type ResolvedPrefab = {
  id: string;
  /** This prefab and its ancestors, nearest first. */
  lineage: string[];
  tags: string[];
  components: Record<string, Record<string, unknown>>;
};

/** Flattens a prefab's `extends` chain into one component set (child fields win). */
export function resolvePrefab(content: ContentStore, id: string, where?: ErrorWhere): ResolvedPrefab {
  const chain: string[] = [];
  let cur = id;
  while (cur) {
    if (chain.includes(cur)) {
      throw new EngineError({
        code: 'PREFAB_CYCLE',
        what: `Prefab "${id}" extends itself through ${[...chain, cur].join(' → ')}`,
        ...(where ? { where } : {}),
        fix: 'Remove one of the "extends" links.',
      });
    }
    chain.push(cur);
    cur = content.get(
      PrefabKind,
      cur,
      chain.length === 1
        ? where
        : { file: content.entry(PrefabKind, chain.at(-2)!)?.file, path: '$.extends' },
    ).extends;
  }
  const datas = chain.map((p) => content.get(PrefabKind, p)).reverse();
  const tags = [...new Set(datas.flatMap((d) => d.tags))];
  const components = deepMerge(...datas.map((d) => d.components)) as Record<string, Record<string, unknown>>;
  return { id, lineage: chain, tags, components };
}
