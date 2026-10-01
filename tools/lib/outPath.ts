import { join } from 'node:path';

/** Absolute path of the repository root (tools/lib/../..). */
export const ROOT = join(import.meta.dirname, '..', '..');

/** Absolute path under out/ for generated files; `rel` is relative to out/. */
export function outPath(rel: string): string {
  return join(ROOT, 'out', rel);
}
