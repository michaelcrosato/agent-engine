import { formatError } from './formatError.ts';

/** Where a failure happened. Fill whatever is known; formatting skips empty fields. */
export type ErrorWhere = {
  /** Repo-relative file, e.g. `games/agent-engine/content/rooms/arena.json`. */
  file?: string;
  /** JSON path inside the file, e.g. `$.entities[3].prefab`. */
  path?: string;
  line?: number;
  col?: number;
  /** Entity label from `world.label(e)`, e.g. `grunt#12 "boss"`. */
  entity?: string;
  component?: string;
  system?: string;
};

export type EngineErrorInfo = {
  /** Stable UPPER_SNAKE id. Listed in docs/errors.md. */
  code: string;
  /** What failed, one sentence. */
  what: string;
  where?: ErrorWhere;
  /** Probable cause. */
  why?: string;
  /** Recommended fix, or the CLI tool to run next. */
  fix?: string;
};

/**
 * The only error type the engine throws. Every field exists so an agent can act on the
 * error without reading engine source: what failed, where, why, and what to do next.
 */
export class EngineError extends Error {
  readonly code: string;
  readonly what: string;
  readonly where: ErrorWhere;
  readonly why: string | undefined;
  readonly fix: string | undefined;

  constructor(info: EngineErrorInfo) {
    super(formatError(info));
    this.name = 'EngineError';
    this.code = info.code;
    this.what = info.what;
    this.where = info.where ?? {};
    this.why = info.why;
    this.fix = info.fix;
  }

  /** Plain JSON form for tools, captures, and MCP results. */
  toJSON(): EngineErrorInfo {
    return { code: this.code, what: this.what, where: this.where, why: this.why, fix: this.fix };
  }

  /** Returns a copy with extra location info merged in (used when re-throwing up the stack). */
  at(where: ErrorWhere): EngineError {
    return new EngineError({ ...this.toJSON(), where: { ...where, ...this.where } });
  }
}

/** Wraps any thrown value as an EngineError so callers can format it uniformly. */
export function toEngineError(err: unknown, fallback: EngineErrorInfo): EngineError {
  if (err instanceof EngineError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new EngineError({ ...fallback, why: fallback.why ? `${fallback.why} (${message})` : message });
}
