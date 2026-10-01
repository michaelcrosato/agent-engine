import type { EngineErrorInfo, ErrorWhere } from './EngineError.ts';

/** Formats the location part of an error, e.g. `rooms/arena.json:12:5 $.entities[3].prefab`. */
export function formatWhere(where: ErrorWhere | undefined): string {
  if (!where) return '';
  const parts: string[] = [];
  if (where.file) {
    let loc = where.file;
    if (where.line !== undefined) loc += `:${where.line}${where.col !== undefined ? `:${where.col}` : ''}`;
    parts.push(loc);
  }
  if (where.path) parts.push(where.path);
  if (where.entity) parts.push(`entity ${where.entity}`);
  if (where.component) parts.push(`component ${where.component}`);
  if (where.system) parts.push(`system ${where.system}`);
  return parts.join(' ');
}

/**
 * Multi-line, agent-readable error text:
 *
 *   ✖ CONTENT_REF_MISSING: Prefab "grunt" not found
 *     at games/fps-demo/content/rooms/arena.json:12:5 $.entities[3].prefab
 *     why: ...
 *     fix: ...
 */
export function formatError(info: EngineErrorInfo): string {
  const lines = [`✖ ${info.code}: ${info.what}`];
  const where = formatWhere(info.where);
  if (where) lines.push(`  at ${where}`);
  if (info.why) lines.push(`  why: ${info.why}`);
  if (info.fix) lines.push(`  fix: ${info.fix}`);
  return lines.join('\n');
}
