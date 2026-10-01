import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { z } from 'zod';
import { EngineError } from '../../engine/core/EngineError.ts';
import { defineTool } from '../lib/defineTool.ts';
import { ROOT } from '../lib/outPath.ts';

/** Where each pinned package's declarations live (installed versions are the source of truth). */
const SOURCES: Record<string, { pkg: string; dirs: string[] }> = {
  three: { pkg: 'three', dirs: ['node_modules/@types/three/src', 'node_modules/@types/three/examples/jsm'] },
  rapier: {
    pkg: '@dimforge/rapier3d-simd-compat',
    dirs: ['node_modules/@dimforge/rapier3d-simd-compat/dist'],
  },
  zod: { pkg: 'zod', dirs: ['node_modules/zod/v4/classic', 'node_modules/zod/v4/core'] },
  vite: { pkg: 'vite', dirs: ['node_modules/vite/dist/node'] },
  vitest: { pkg: 'vitest', dirs: ['node_modules/vitest/dist'] },
  playwright: { pkg: 'playwright', dirs: ['node_modules/playwright-core/types'] },
  mcp: { pkg: '@modelcontextprotocol/sdk', dirs: ['node_modules/@modelcontextprotocol/sdk/dist/esm/server'] },
  engine: { pkg: '', dirs: ['engine'] },
};

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.d\.c?ts$/.test(n) || (dir.includes('engine') && n.endsWith('.ts') && !n.endsWith('.test.ts')))
      out.push(p);
  }
}

function version(pkg: string): string {
  if (!pkg) return 'repo source';
  try {
    return JSON.parse(readFileSync(join(ROOT, 'node_modules', pkg, 'package.json'), 'utf8'))
      .version as string;
  } catch {
    return '?';
  }
}

export const apiTool = defineTool({
  name: 'api',
  summary:
    'Look up real signatures in the pinned, installed packages (three, rapier, zod, vite, ...) or engine source.',
  usage:
    'npm run api -- <three|rapier|zod|vite|vitest|playwright|mcp|engine> <query> [--limit 12]\n' +
    '  query: a name ("castRay"), Class.member ("Vector3.lerp"), or text\n' +
    '  e.g. npm run api -- rapier computeColliderMovement    npm run api -- three Raycaster.intersectObject',
  args: z.object({
    source: z.string().meta({ description: Object.keys(SOURCES).join(', ') }),
    query: z.string(),
    limit: z.number().int().min(1).max(100).default(12),
  }),
  positional: ['source', 'query'],
  async run(a) {
    const src = SOURCES[a.source];
    if (!src) {
      throw new EngineError({
        code: 'API_SOURCE_UNKNOWN',
        what: `Unknown source "${a.source}"`,
        fix: `Use one of: ${Object.keys(SOURCES).join(', ')}`,
      });
    }
    const files: string[] = [];
    for (const d of src.dirs) walk(join(ROOT, d), files);
    const [cls, member] = a.query.includes('.')
      ? (a.query.split('.') as [string, string])
      : [undefined, a.query];
    const re = new RegExp(`\\b${member!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const hits: string[] = [];
    for (const f of files) {
      const lines = readFileSync(f, 'utf8').split('\n');
      if (cls && !lines.some((l) => new RegExp(`(class|interface|type|function)\\s+${cls}\\b`).test(l)))
        continue;
      lines.forEach((l, i) => {
        if (hits.length >= a.limit * 4 || !re.test(l)) return;
        const t = l.trim();
        if (
          !/^(export|declare|static|readonly|get |set |public|protected|[A-Za-z_$][\w$]*[?]?[(:<]|class |interface |type |function )/.test(
            t,
          )
        )
          return;
        const sig = t.length > 220 ? `${t.slice(0, 220)}…` : t;
        const exact = new RegExp(`(^|[\\s.])${member}\\s*[(:<?]`).test(t) ? 0 : 1;
        hits.push(`${exact}${relative(ROOT, f)}:${i + 1}  ${sig}`);
      });
    }
    hits.sort();
    const shown = hits.slice(0, a.limit).map((h) => h.slice(1));
    return {
      ok: hits.length > 0,
      summary: `${a.source} ${version(src.pkg)} — ${hits.length} match${hits.length === 1 ? '' : 'es'} for "${a.query}"${hits.length > a.limit ? ` (showing ${a.limit}; --limit for more)` : ''}\n${shown.join('\n') || '(none; try a shorter query)'}`,
    };
  },
});
