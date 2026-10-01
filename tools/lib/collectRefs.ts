import { z } from 'zod';
import { formatJsonPath } from '../../engine/schema/jsonPath.ts';

export type Ref = { kind: string; id: string; path: string };

type Def = { type: string; [k: string]: unknown };
const defOf = (s: z.ZodType): Def => (s as unknown as { _zod: { def: Def } })._zod.def;

function refKind(s: z.ZodType): string | undefined {
  const m = z.globalRegistry.get(s) as { ref?: string } | undefined;
  return m?.ref;
}

/**
 * Walks a schema and a value together and collects every string field whose schema carries
 * `meta({ ref: kind })` (field.ref, field.entity, ...). Used by validation to catch dangling ids.
 */
export function collectRefs(
  schema: z.ZodType,
  value: unknown,
  path: PropertyKey[] = [],
  out: Ref[] = [],
): Ref[] {
  let s: z.ZodType | undefined = schema;
  let kind: string | undefined;
  for (let i = 0; i < 16 && s; i++) {
    kind ??= refKind(s);
    const d = defOf(s);
    if (['default', 'prefault', 'optional', 'nullable', 'readonly', 'catch'].includes(d.type))
      s = d.innerType as z.ZodType;
    else if (d.type === 'pipe') s = d.in as z.ZodType;
    else break;
  }
  if (!s || value === undefined || value === null) return out;
  if (kind && typeof value === 'string') {
    if (value) out.push({ kind, id: value, path: formatJsonPath(path) });
    return out;
  }
  const d = defOf(s);
  if (d.type === 'object' && typeof value === 'object') {
    for (const [k, sub] of Object.entries(d.shape as Record<string, z.ZodType>)) {
      collectRefs(sub, (value as Record<string, unknown>)[k], [...path, k], out);
    }
  } else if (d.type === 'array' && Array.isArray(value)) {
    for (const [i, v] of value.entries()) collectRefs(d.element as z.ZodType, v, [...path, i], out);
  } else if (d.type === 'record' && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>))
      collectRefs(d.valueType as z.ZodType, v, [...path, k], out);
  } else if (d.type === 'union' && typeof value === 'object') {
    const disc = (value as Record<string, unknown>).op ?? (value as Record<string, unknown>).type;
    for (const opt of d.options as z.ZodType[]) {
      const shape = defOf(opt).shape as Record<string, z.ZodType> | undefined;
      const lit = shape?.op ?? shape?.type;
      const vals = lit ? (defOf(lit).values as unknown[] | undefined) : undefined;
      if (vals?.includes(disc)) collectRefs(opt, value, path, out);
    }
  }
  return out;
}
