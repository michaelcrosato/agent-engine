import type { z } from 'zod';
import { EngineError, type ErrorWhere } from '../core/EngineError.ts';
import { didYouMean } from '../core/suggest.ts';
import { joinJsonPath } from './jsonPath.ts';
import { objectShape, schemaAt } from './schemaWalk.ts';

/** Maps a JSON path to a source position; provided by `parseJson` for content files. */
export type Locate = (jsonPath: string) => { line: number; col: number } | undefined;

export type ValidateContext = {
  /** What is being validated, for messages: 'component Health', 'room "arena"'. */
  subject: string;
  where?: ErrorWhere;
  /** JSON path of the validated value inside its file. Default `$`. */
  basePath?: string;
  locate?: Locate;
  /** Extra fix hint appended to every error (e.g. which CLI to run). */
  fixHint?: string;
};

export type ValidateResult<T> = { ok: true; value: T } | { ok: false; errors: EngineError[] };

function issueToError(issue: z.core.$ZodIssue, root: z.ZodType, ctx: ValidateContext): EngineError {
  const base = ctx.basePath ?? '$';
  const path = joinJsonPath(base, issue.path);
  const pos = ctx.locate?.(path) ?? ctx.locate?.(joinJsonPath(base, issue.path.slice(0, -1)));
  const where: ErrorWhere = { ...ctx.where, path, ...(pos ? { line: pos.line, col: pos.col } : {}) };
  let what = `${ctx.subject}: ${issue.message}`;
  let why: string | undefined;
  let fix: string | undefined = ctx.fixHint;

  if (issue.code === 'unrecognized_keys') {
    const shape = objectShape(schemaAt(root, issue.path) ?? root);
    const known = shape ? Object.keys(shape) : [];
    const keys = issue.keys;
    what = `${ctx.subject}: unknown field${keys.length > 1 ? 's' : ''} ${keys.map((k) => `"${k}"`).join(', ')}`;
    why = `The schema only allows: ${known.join(', ') || '(no fields)'}.`;
    fix = `${keys.map((k) => `"${k}": ${didYouMean(k, known)}`).join(' ')}${ctx.fixHint ? ` ${ctx.fixHint}` : ''}`;
  } else if (issue.code === 'invalid_type') {
    why = `Field has the wrong JSON type.`;
  } else if (issue.code === 'invalid_value' && 'values' in issue) {
    why = `Allowed values: ${issue.values.map((v) => JSON.stringify(v)).join(', ')}.`;
  } else if (issue.code === 'too_small' || issue.code === 'too_big') {
    why = 'Value is outside the allowed range.';
  }
  return new EngineError({
    code: 'SCHEMA_INVALID',
    what,
    where,
    ...(why ? { why } : {}),
    ...(fix ? { fix } : {}),
  });
}

/** Validates `input` against `schema`, returning parsed output (defaults applied) or teaching errors. */
export function validate<S extends z.ZodType>(
  schema: S,
  input: unknown,
  ctx: ValidateContext,
): ValidateResult<z.output<S>> {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  return { ok: false, errors: r.error.issues.map((i) => issueToError(i, schema, ctx)) };
}

/** Like `validate` but throws the first error (all errors are listed in its `why`). */
export function parseOrThrow<S extends z.ZodType>(
  schema: S,
  input: unknown,
  ctx: ValidateContext,
): z.output<S> {
  const r = validate(schema, input, ctx);
  if (r.ok) return r.value;
  const [first, ...rest] = r.errors;
  if (!rest.length) throw first!;
  throw new EngineError({
    ...first!.toJSON(),
    why: `${first!.why ?? ''} (+${rest.length} more: ${rest.map((e) => e.where.path).join(', ')})`.trim(),
  });
}
