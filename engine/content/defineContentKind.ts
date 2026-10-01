import type { z } from 'zod';

/**
 * A kind of data file: a name, a folder under `data/`, and a schema.
 * Files live at `engine/data/<folder>/<id>.json` (shared) or `games/<game>/data/<folder>/<id>.json`.
 */
export type ContentKind<S extends z.ZodType = z.ZodType> = {
  readonly kind: 'contentKind';
  /** Singular name used in refs and tools: 'sound', 'prefab', 'room'. */
  readonly name: string;
  /** Folder under data/: 'sounds', 'prefabs', 'rooms'. */
  readonly folder: string;
  readonly doc: string;
  readonly schema: S;
};

export type ContentValue<K> = K extends ContentKind<infer S> ? z.output<S> : never;

export function defineContentKind<S extends z.ZodType>(def: {
  name: string;
  folder: string;
  doc: string;
  schema: S;
}): ContentKind<S> {
  return { kind: 'contentKind', ...def };
}
