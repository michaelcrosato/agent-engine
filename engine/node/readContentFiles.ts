import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ContentFile } from '../content/ContentStore.ts';

/** Repo root (two levels above engine/node/). */
export const REPO_ROOT = join(import.meta.dirname, '..', '..');

function walk(dir: string, out: string[]): void {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const n of names) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith('.json')) out.push(p);
  }
}

/** Reads engine/data/** and games/<game>/data/** from disk (Node only). */
export function readContentFiles(game: string | undefined, root = REPO_ROOT): ContentFile[] {
  const paths: string[] = [];
  walk(join(root, 'engine', 'data'), paths);
  if (game) walk(join(root, 'games', game, 'data'), paths);
  return paths.map((p) => ({ path: relative(root, p).replace(/\\/g, '/'), text: readFileSync(p, 'utf8') }));
}
