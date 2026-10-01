import { Euler, MathUtils, Quaternion, Vector2, Vector3 } from 'three';
import { z } from 'zod';

/**
 * Field helpers: the one way to declare component and content fields.
 * Each helper returns a zod schema that carries its default, its docs, and editor hints,
 * so one declaration drives validation, defaults, TypeScript types, JSON Schema,
 * generated docs, and the editor inspector.
 *
 *   schema: {
 *     max: field.number(100, { min: 1, doc: 'Maximum hit points' }),
 *     offset: field.vec3([0, 1, 0], { doc: 'Local offset' }),
 *   }
 */
export type FieldOpts = {
  /** One-line description shown in docs, the inspector, and MCP tool schemas. */
  doc?: string;
  min?: number;
  max?: number;
  /** Inspector drag step. */
  step?: number;
  /** Unit label: 'm', 'm/s', 's', 'deg', 'hp', ... */
  unit?: string;
};

type Vec3In = number | [number, number, number];

function meta(o: FieldOpts | undefined, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const m: Record<string, unknown> = { ...extra };
  if (o?.doc) m.description = o.doc;
  if (o?.step !== undefined) m.step = o.step;
  if (o?.unit) m.unit = o.unit;
  return m;
}

function num(o: FieldOpts | undefined, int: boolean): z.ZodNumber {
  let s = int ? z.number().int() : z.number();
  if (o?.min !== undefined) s = s.min(o.min);
  if (o?.max !== undefined) s = s.max(o.max);
  return s;
}

const vec3Input = z.union([z.number(), z.tuple([z.number(), z.number(), z.number()])], {
  error: 'Expected a number (uniform) or an [x, y, z] array',
});

const vec2Input = z.union([z.number(), z.tuple([z.number(), z.number()])], {
  error: 'Expected a number (uniform) or an [x, y] array',
});

const rotInput = z.union([z.number(), z.tuple([z.number(), z.number(), z.number()])], {
  error: 'Expected yaw degrees (number) or [x, y, z] Euler degrees (YXZ order)',
});

/** Parses `[x,y,z]` or a uniform number into a fresh Vector3. */
export function toVec3(v: Vec3In): Vector3 {
  return typeof v === 'number' ? new Vector3(v, v, v) : new Vector3(v[0], v[1], v[2]);
}

/** Parses yaw degrees or `[x,y,z]` Euler degrees (YXZ order) into a Quaternion. */
export function toQuat(v: Vec3In): Quaternion {
  const [x, y, z] = typeof v === 'number' ? [0, v, 0] : v;
  const e = new Euler(MathUtils.degToRad(x), MathUtils.degToRad(y), MathUtils.degToRad(z), 'YXZ');
  return new Quaternion().setFromEuler(e);
}

const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const field = {
  number(def: number, o?: FieldOpts) {
    return num(o, false).default(def).meta(meta(o));
  },
  int(def: number, o?: FieldOpts) {
    return num(o, true).default(def).meta(meta(o));
  },
  bool(def: boolean, o?: FieldOpts) {
    return z.boolean().default(def).meta(meta(o));
  },
  string(def: string, o?: FieldOpts) {
    return z.string().default(def).meta(meta(o));
  },
  /** One of a fixed set of strings. */
  enum<const T extends readonly [string, ...string[]]>(values: T, def: T[number], o?: FieldOpts) {
    return z.enum(values).default(def).meta(meta(o));
  },
  /** `[x, y, z]` or a uniform number in JSON; a fresh `THREE.Vector3` at runtime. */
  vec3(def: Vec3In, o?: FieldOpts) {
    return vec3Input
      .transform(toVec3)
      .prefault(def)
      .meta(meta(o, { widget: 'vec3' }));
  },
  /** `[x, y]` or a uniform number in JSON; a fresh `THREE.Vector2` at runtime. */
  vec2(def: number | [number, number], o?: FieldOpts) {
    return vec2Input
      .transform((v) => (typeof v === 'number' ? new Vector2(v, v) : new Vector2(v[0], v[1])))
      .prefault(def)
      .meta(meta(o, { widget: 'vec2' }));
  },
  /** Yaw degrees or `[x, y, z]` Euler degrees (YXZ) in JSON; a `THREE.Quaternion` at runtime. */
  rot(def: Vec3In, o?: FieldOpts) {
    return rotInput
      .transform(toQuat)
      .prefault(def)
      .meta(meta(o, { widget: 'rot', unit: 'deg' }));
  },
  /** CSS-style hex color string, kept as a string at runtime (`new Color(str)` to use). */
  color(def: string, o?: FieldOpts) {
    return z
      .string()
      .regex(COLOR_RE, { error: 'Expected a hex color like "#ff8800" or "#f80"' })
      .default(def)
      .meta(meta(o, { widget: 'color' }));
  },
  /** Id of a content item of `kind` ('sound', 'prefab', ...). Empty string means none. */
  ref(kind: string, def = '', o?: FieldOpts) {
    return z
      .string()
      .default(def)
      .meta(meta(o, { ref: kind }));
  },
  /** Name of an entity in the same room (signal targets, follow targets). Empty means none. */
  entity(def = '', o?: FieldOpts) {
    return z
      .string()
      .default(def)
      .meta(meta(o, { ref: 'entity' }));
  },
  /** Array of `item`; the default is copied per use so instances never share arrays. */
  list<T extends z.ZodType>(item: T, def: z.input<T>[] = [], o?: FieldOpts) {
    return z
      .array(item)
      .prefault(() => structuredClone(def))
      .meta(meta(o));
  },
  /** Nested object of fields; missing keys take their field defaults. */
  object<S extends z.ZodRawShape>(shape: S, o?: FieldOpts) {
    return z
      .object(shape)
      .strict()
      .prefault({} as never)
      .meta(meta(o));
  },
};
