import type { z } from 'zod';

type AnyDef = { type: string; [k: string]: unknown };

function defOf(s: z.ZodType): AnyDef {
  return (s as unknown as { _zod: { def: AnyDef } })._zod.def;
}

/** Strips default/prefault/optional/nullable/readonly/catch and the input side of pipes. */
export function unwrapSchema(s: z.ZodType): z.ZodType {
  let cur = s;
  for (let i = 0; i < 16; i++) {
    const d = defOf(cur);
    if (
      ['default', 'prefault', 'optional', 'nullable', 'readonly', 'catch', 'nonoptional'].includes(d.type)
    ) {
      cur = d.innerType as z.ZodType;
    } else if (d.type === 'pipe') {
      cur = d.in as z.ZodType;
    } else {
      return cur;
    }
  }
  return cur;
}

/** The zod def type after unwrapping: 'object', 'array', 'number', 'union', ... */
export function schemaKind(s: z.ZodType): string {
  return defOf(unwrapSchema(s)).type;
}

/** Field schemas of an object schema (after unwrapping), or undefined if not an object. */
export function objectShape(s: z.ZodType): Record<string, z.ZodType> | undefined {
  const d = defOf(unwrapSchema(s));
  return d.type === 'object' ? (d.shape as Record<string, z.ZodType>) : undefined;
}

/** Walks object keys / array indices / record values to the schema at `path`. */
export function schemaAt(root: z.ZodType, path: readonly PropertyKey[]): z.ZodType | undefined {
  let cur: z.ZodType | undefined = root;
  for (const seg of path) {
    if (!cur) return undefined;
    const d = defOf(unwrapSchema(cur));
    if (d.type === 'object') cur = (d.shape as Record<string, z.ZodType>)[String(seg)];
    else if (d.type === 'array') cur = d.element as z.ZodType;
    else if (d.type === 'record') cur = d.valueType as z.ZodType;
    else if (d.type === 'tuple') cur = (d.items as z.ZodType[])[Number(seg)];
    else return undefined;
  }
  return cur;
}
