import { z } from 'zod';
import type { TexCanvas } from './TexCanvas.ts';

/** A texture recipe step: `{ "op": "<name>", ...fields }`. */
export type TextureOp<S extends z.ZodRawShape = z.ZodRawShape> = {
  readonly name: string;
  readonly doc: string;
  readonly schema: z.ZodObject<S & { op: z.ZodLiteral<string> }>;
  readonly apply: (c: TexCanvas, p: z.output<z.ZodObject<S>>, seed: number) => void;
};

/** Defines a texture op. Fields need defaults so `{ "op": "name" }` alone is valid. */
export function defineTextureOp<S extends z.ZodRawShape>(def: {
  name: string;
  doc: string;
  fields: S;
  apply: (c: TexCanvas, p: z.output<z.ZodObject<S>>, seed: number) => void;
}): TextureOp<S> {
  const schema = z
    .object({ op: z.literal(def.name), ...def.fields })
    .strict()
    .meta({ description: def.doc }) as unknown as z.ZodObject<S & { op: z.ZodLiteral<string> }>;
  return { name: def.name, doc: def.doc, schema, apply: def.apply };
}

/** Shared field builders for ops. */
export const opField = {
  color: (def: string, doc = 'Hex color') =>
    z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { error: 'Expected a hex color like "#8a8f99"' })
      .default(def)
      .meta({ description: doc, widget: 'color' }),
  amount: (def = 1, doc = 'Blend strength 0..1') =>
    z.number().min(0).max(1).default(def).meta({ description: doc }),
  height: (def = 0, doc = 'Height added where the pattern is (negative = recessed)') =>
    z.number().min(-1).max(1).default(def).meta({ description: doc }),
  rough: (doc = 'Roughness where the pattern is (-1 = unchanged)') =>
    z.number().min(-1).max(1).default(-1).meta({ description: doc }),
  glow: (doc = 'Emission where the pattern is (0..1)') =>
    z.number().min(0).max(1).default(0).meta({ description: doc }),
  count: (def: number, doc: string) =>
    z.number().int().min(1).max(256).default(def).meta({ description: doc }),
};
