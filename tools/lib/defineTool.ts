import type { z } from 'zod';

/** What every tool returns: a compact summary first, details and files on request. */
export type ToolResult = {
  ok: boolean;
  /** Short human/agent-readable summary (a few lines). Printed first. */
  summary: string;
  /** Structured data for --json and MCP callers (keep it bounded; big data goes to files). */
  details?: unknown;
  /** Repo-relative files written (images, audio, captures, reports) under out/. */
  files?: string[];
};

export type ToolIO = {
  /** Absolute repo root. */
  root: string;
  /** Progress line (stderr in the CLI; dropped in MCP). */
  progress(msg: string): void;
};

/**
 * A command available as `npm run <name> -- ...` (or `npm run tool -- <name> ...`) and as an MCP
 * tool. The zod `args` object is the single source for CLI parsing, validation, help, and the
 * MCP input schema.
 */
export type ToolDef<S extends z.ZodObject = z.ZodObject> = {
  readonly name: string;
  /** One line shown in `npm run tool -- list` and MCP tool listings. */
  readonly summary: string;
  /** Usage text with examples (shown by --help). */
  readonly usage: string;
  readonly args: S;
  /** Arg names that may be given positionally, in order. */
  readonly positional: readonly string[];
  readonly run: (args: z.output<S>, io: ToolIO) => Promise<ToolResult>;
};

export function defineTool<S extends z.ZodObject>(def: {
  name: string;
  summary: string;
  usage: string;
  args: S;
  positional?: readonly (keyof z.output<S> & string)[];
  run: (args: z.output<S>, io: ToolIO) => Promise<ToolResult>;
}): ToolDef<S> {
  return { positional: [], ...def };
}
