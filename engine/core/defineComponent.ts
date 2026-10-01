import { z } from 'zod';
import { parseOrThrow } from '../schema/validate.ts';
import { EngineError, type ErrorWhere } from './EngineError.ts';

export type FieldShape = Record<string, z.ZodType>;

/** A component type: a name, a one-line doc, and a field schema. Data is plain per-entity state. */
export type ComponentType<S extends FieldShape = FieldShape> = {
  readonly kind: 'component';
  readonly name: string;
  readonly doc: string;
  readonly schema: z.ZodObject<S>;
  /** Validates JSON-form input, applies defaults, returns fresh runtime data. Throws teaching errors. */
  create(input?: unknown, where?: ErrorWhere): z.output<z.ZodObject<S>>;
};

/** Runtime data of a component type (what `world.get` returns). */
export type ComponentData<C> = C extends ComponentType<infer S> ? z.output<z.ZodObject<S>> : never;
/** JSON-form input of a component type (what prefabs and `world.add` accept). */
export type ComponentInput<C> = C extends ComponentType<infer S> ? z.input<z.ZodObject<S>> : never;

const NAME_RE = /^[A-Z][A-Za-z0-9]*$/;

/**
 * Defines a component. Every field needs a default (use `field.*`), so `{}` is always valid.
 *
 *   export const Health = defineComponent({
 *     name: 'Health',
 *     doc: 'Hit points. Emits Damaged and Died events.',
 *     schema: { max: field.number(100, { min: 1 }), current: field.number(-1) },
 *   });
 */
export function defineComponent<S extends FieldShape>(def: {
  name: string;
  doc: string;
  schema: S;
}): ComponentType<S> {
  if (!NAME_RE.test(def.name)) {
    throw new EngineError({
      code: 'COMPONENT_NAME_INVALID',
      what: `Component name "${def.name}" is not PascalCase`,
      why: 'Component names are used as JSON keys in prefabs and must be stable identifiers.',
      fix: 'Rename it, e.g. "Health" or "DoorLock", and match the file name (Health.ts).',
    });
  }
  const schema = z.object(def.schema).strict();
  return {
    kind: 'component',
    name: def.name,
    doc: def.doc,
    schema,
    create(input?: unknown, where?: ErrorWhere) {
      return parseOrThrow(schema, input ?? {}, {
        subject: `component ${def.name}`,
        where: { component: def.name, ...where },
        fixHint: `See fields with: npm run tool -- describe component ${def.name}`,
      });
    },
  };
}
