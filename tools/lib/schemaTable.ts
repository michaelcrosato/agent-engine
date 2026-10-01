import { z } from 'zod';

type JsonSchema = {
  type?: string | string[];
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  anyOf?: JsonSchema[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  unit?: string;
  ref?: string;
  widget?: string;
};

function typeOf(s: JsonSchema): string {
  if (s.ref) return `${s.ref} id`;
  if (s.widget === 'vec3' || s.widget === 'rot') return s.widget === 'rot' ? 'deg | [x,y,z]' : 'n | [x,y,z]';
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join('|');
  if (s.anyOf) return s.anyOf.map(typeOf).join(' | ');
  if (s.type === 'array') return `${s.items ? typeOf(s.items) : 'any'}[]`;
  if (Array.isArray(s.type)) return s.type.join('|');
  return s.type ?? 'any';
}

/** One line per field: `name  type = default  [min..max] unit — description`. */
export function schemaTable(schema: z.ZodType): string[] {
  const js = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as JsonSchema;
  const props = js.properties ?? {};
  const width = Math.max(4, ...Object.keys(props).map((k) => k.length));
  const bound = (v: number | undefined) =>
    v === undefined || Math.abs(v) >= Number.MAX_SAFE_INTEGER ? undefined : v;
  return Object.entries(props).map(([name, p]) => {
    const lo = bound(p.minimum);
    const hi = bound(p.maximum);
    const range = lo !== undefined || hi !== undefined ? ` [${lo ?? ''}..${hi ?? ''}]` : '';
    const def = p.default !== undefined ? ` = ${JSON.stringify(p.default)}` : '';
    const unit = p.unit ? ` ${p.unit}` : '';
    const doc = p.description ? ` — ${p.description}` : '';
    return `  ${name.padEnd(width)}  ${typeOf(p)}${def}${range}${unit}${doc}`;
  });
}
