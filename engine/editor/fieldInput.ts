import { z } from 'zod';
import { schemaKind, unwrapSchema } from '../schema/schemaWalk.ts';
import { h } from './h.ts';

/** Editor hints carried by `field.*` schemas (see engine/schema/field.ts). */
export type FieldMeta = { description?: string; widget?: string; ref?: string; unit?: string; step?: number };

export function fieldMeta(s: z.ZodType): FieldMeta {
  return (z.globalRegistry.get(s) ?? {}) as FieldMeta;
}

type Def = { type: string; entries?: Record<string, string> };
const defOf = (s: z.ZodType) => (unwrapSchema(s) as unknown as { _zod: { def: Def } })._zod.def;

function numberBox(value: number, step: number | undefined, onChange: (v: number) => void): HTMLInputElement {
  const i = h('input', {
    type: 'number',
    value: String(value),
    step: step === undefined ? 'any' : String(step),
  });
  i.addEventListener('change', () => {
    const v = Number(i.value);
    if (Number.isFinite(v)) onChange(v);
  });
  return i;
}

function vecBox(
  value: unknown,
  n: 2 | 3,
  step: number | undefined,
  emit: (v: number[]) => void,
): HTMLElement {
  const arr = Array.isArray(value)
    ? (value as number[])
    : Array(n).fill(typeof value === 'number' ? value : 0);
  const wrap = h('span', { className: 'vec' });
  const cur = [...arr];
  for (let k = 0; k < n; k++) {
    wrap.append(
      numberBox(cur[k] ?? 0, step, (v) => {
        cur[k] = v;
        emit([...cur]);
      }),
    );
  }
  return wrap;
}

/**
 * An input for one schema field, showing `value` (JSON form) and calling `onChange` with the new
 * JSON value. Numbers, booleans, enums, strings, vectors, rotations, colors, and content refs get
 * dedicated widgets; lists and objects are edited as JSON. `refIds(kind)` lists ids for refs.
 */
export function fieldInput(
  s: z.ZodType,
  value: unknown,
  onChange: (v: unknown) => void,
  refIds: (kind: string) => readonly string[],
): HTMLElement {
  const meta = fieldMeta(s);
  const kind = schemaKind(s);
  if (meta.widget === 'vec3' || meta.widget === 'vec2')
    return vecBox(value, meta.widget === 'vec3' ? 3 : 2, meta.step, onChange);
  if (meta.widget === 'rot') {
    const v = typeof value === 'number' ? [0, value, 0] : value;
    return vecBox(v, 3, 1, (r) => onChange(r[0] === 0 && r[2] === 0 ? r[1] : r));
  }
  if (meta.widget === 'color') {
    const wrap = h('span', { className: 'color' });
    const pick = h('input', { type: 'color', value: String(value ?? '#ffffff') });
    const text = h('input', { type: 'text', value: String(value ?? '') });
    pick.addEventListener('input', () => {
      text.value = pick.value;
    });
    pick.addEventListener('change', () => onChange(pick.value));
    text.addEventListener('change', () => onChange(text.value));
    wrap.append(pick, text);
    return wrap;
  }
  if (kind === 'boolean') {
    const i = h('input', { type: 'checkbox', checked: value === true });
    i.addEventListener('change', () => onChange(i.checked));
    return i;
  }
  if (kind === 'number') return numberBox(Number(value ?? 0), meta.step, onChange);
  if (kind === 'enum') {
    const sel = h('select');
    for (const opt of Object.values(defOf(s).entries ?? {}))
      sel.append(h('option', { value: opt, textContent: opt }));
    sel.value = String(value);
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }
  if (kind === 'string' && String(value ?? '').includes('\n')) {
    const ta = h('textarea', { value: String(value), rows: 2, spellcheck: false });
    ta.addEventListener('change', () => onChange(ta.value));
    return ta;
  }
  if (kind === 'string') {
    const i = h('input', { type: 'text', value: String(value ?? '') });
    if (meta.ref && meta.ref !== 'entity') {
      const id = `ref-${meta.ref}`;
      if (!document.getElementById(id)) {
        const list = h('datalist', { id });
        for (const r of refIds(meta.ref)) list.append(h('option', { value: r }));
        document.body.append(list);
      }
      i.setAttribute('list', id);
    }
    i.addEventListener('change', () => onChange(i.value));
    return i;
  }
  const ta = h('textarea', { value: JSON.stringify(value, null, 1), rows: 3, spellcheck: false });
  ta.addEventListener('change', () => {
    try {
      onChange(JSON.parse(ta.value));
      ta.classList.remove('bad');
    } catch {
      ta.classList.add('bad');
    }
  });
  return ta;
}
