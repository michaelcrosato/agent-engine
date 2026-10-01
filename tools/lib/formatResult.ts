import type { ToolResult } from './defineTool.ts';

/** CLI rendering of a tool result: summary, then files, then (with --json) the details. */
export function formatResult(r: ToolResult, opts: { json?: boolean } = {}): string {
  if (opts.json) return JSON.stringify(r, null, 2);
  const lines = [r.summary.trimEnd()];
  if (r.files?.length) lines.push(`files:\n${r.files.map((f) => `  ${f}`).join('\n')}`);
  return lines.join('\n');
}
