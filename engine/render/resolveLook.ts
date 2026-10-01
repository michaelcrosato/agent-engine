import type { ContentStore } from '../content/ContentStore.ts';
import { EngineError } from '../core/EngineError.ts';
import { deepMerge } from '../prefab/deepMerge.ts';
import { validate } from '../schema/validate.ts';
import { type LookData, LookKind, LookSchema } from './Look.ts';

/**
 * A look with its `extends` chain applied: raw JSON merges parent → child (materials merge
 * per name and field), then defaults fill the rest.
 */
export function resolveLook(content: ContentStore, id: string): LookData {
  const chain: string[] = [];
  let cur = id;
  while (cur) {
    if (chain.includes(cur)) {
      throw new EngineError({
        code: 'LOOK_CYCLE',
        what: `Look "${id}" extends itself (${[...chain, cur].join(' → ')})`,
      });
    }
    content.get(LookKind, cur);
    chain.push(cur);
    cur = (content.entry(LookKind, cur)!.raw as { extends?: string }).extends ?? '';
  }
  const raws = chain.reverse().map((c) => content.entry(LookKind, c)!.raw as Record<string, unknown>);
  const merged = deepMerge(...raws);
  delete merged.extends;
  const r = validate(LookSchema, merged, {
    subject: `look "${id}" (merged)`,
    where: { file: content.entry(LookKind, id)!.file },
  });
  if (!r.ok) throw r.errors[0]!;
  return r.value;
}
