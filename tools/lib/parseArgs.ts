import type { z } from 'zod';
import { EngineError } from '../../engine/core/EngineError.ts';
import { didYouMean } from '../../engine/core/suggest.ts';
import { objectShape, schemaKind } from '../../engine/schema/schemaWalk.ts';
import { validate } from '../../engine/schema/validate.ts';
import type { ToolDef } from './defineTool.ts';

function coerce(schema: z.ZodType | undefined, raw: string | true): unknown {
  const kind = schema ? schemaKind(schema) : 'string';
  if (raw === true) return kind === 'boolean' ? true : '';
  if (kind === 'number') return Number(raw);
  if (kind === 'boolean') return raw !== 'false' && raw !== '0';
  if (kind === 'array')
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return raw;
}

/**
 * Parses `positional --name value --flag --name=value` into a tool's args and validates them.
 * Unknown flags and bad values throw teaching errors that show the tool's usage.
 */
export function parseArgs(tool: ToolDef, argv: readonly string[]): z.output<typeof tool.args> {
  const shape = objectShape(tool.args) ?? {};
  const out: Record<string, unknown> = {};
  const pos: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith('--')) {
      pos.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    const name = (eq > 0 ? a.slice(2, eq) : a.slice(2)).replace(/-([a-z])/g, (_, c: string) =>
      c.toUpperCase(),
    );
    if (!(name in shape)) {
      throw new EngineError({
        code: 'TOOL_ARG_UNKNOWN',
        what: `${tool.name}: unknown option --${name}`,
        why: didYouMean(name, Object.keys(shape)),
        fix: `Usage: ${tool.usage.split('\n')[0]}  (npm run tool -- ${tool.name} --help)`,
      });
    }
    const isBool = schemaKind(shape[name]!) === 'boolean';
    let raw: string | true;
    if (eq > 0) raw = a.slice(eq + 1);
    else if (!isBool && i + 1 < argv.length && !argv[i + 1]!.startsWith('--')) raw = argv[++i]!;
    else raw = true;
    out[name] = coerce(shape[name], raw);
  }
  tool.positional.forEach((name, i) => {
    if (pos[i] !== undefined && out[name] === undefined) out[name] = coerce(shape[name], pos[i]!);
  });
  if (pos.length > tool.positional.length) {
    throw new EngineError({
      code: 'TOOL_ARG_EXTRA',
      what: `${tool.name}: unexpected argument "${pos[tool.positional.length]}"`,
      fix: `Usage: ${tool.usage.split('\n')[0]}`,
    });
  }
  const r = validate(tool.args, out, {
    subject: `${tool.name} args`,
    fixHint: `Usage: ${tool.usage.split('\n')[0]}`,
  });
  if (!r.ok) throw r.errors[0]!;
  return r.value;
}

/** Help text for a tool: usage plus each option with its type, default, and description. */
export function toolHelp(tool: ToolDef): string {
  const shape = objectShape(tool.args) ?? {};
  const lines = [`${tool.name} — ${tool.summary}`, '', tool.usage, '', 'Options:'];
  for (const [name, s] of Object.entries(shape)) {
    const meta = (s as unknown as { meta?: () => { description?: string } | undefined }).meta?.();
    const flag = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    lines.push(`  --${flag} (${schemaKind(s)})${meta?.description ? `  ${meta.description}` : ''}`);
  }
  return lines.join('\n');
}
