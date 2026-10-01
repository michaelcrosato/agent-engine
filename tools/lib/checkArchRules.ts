import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { ROOT } from './outPath.ts';

export type RuleIssue = {
  file: string;
  line: number;
  rule: string;
  message: string;
  severity: 'error' | 'warn';
};

const MAX_LINES_WARN = 300;
const MAX_LINES_ERROR = 400;

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith('.ts')) out.push(p);
  }
}

/** Files allowed to export several peers without one matching the file name. */
const COLLECTION =
  /(Events|Shaders|Styles)\.ts$|\/(api|testing|tools|cli|main|theory|layers|easing|yaw|noise|fft|jsonPath|schemaWalk|contentPath|envelope|effects|paint|maskStyle|brickPattern|collectRefs)\.ts$/;

function exportsName(src: string, name: string): boolean {
  return new RegExp(
    `export\\s+(?:declare\\s+)?(?:const|let|function|async function|class|type|interface)\\s+${name}\\b`,
  ).test(src);
}

/**
 * Structural rules from AGENTS.md: small files, file name = primary export, no default exports,
 * no decorators, Node-only APIs only where allowed, games use the public API, rooms have tests.
 */
export function checkArchRules(root = ROOT): RuleIssue[] {
  const files: string[] = [];
  for (const d of ['engine', 'games', 'tools']) walk(join(root, d), files);
  const issues: RuleIssue[] = [];
  const add = (
    file: string,
    line: number,
    rule: string,
    message: string,
    severity: 'error' | 'warn' = 'error',
  ) => issues.push({ file: relative(root, file), line, rule, message, severity });
  for (const f of files) {
    const rel = relative(root, f).replace(/\\/g, '/');
    const src = readFileSync(f, 'utf8');
    const lines = src.split('\n');
    const isTest = rel.endsWith('.test.ts');
    if (lines.length > MAX_LINES_ERROR)
      add(
        f,
        1,
        'file-size',
        `${lines.length} lines (max ${MAX_LINES_ERROR}); split it into one concept per file`,
      );
    else if (lines.length > MAX_LINES_WARN)
      add(f, 1, 'file-size', `${lines.length} lines (aim for ≤ ${MAX_LINES_WARN})`, 'warn');
    const base = basename(f, '.ts');
    if (
      !isTest &&
      !COLLECTION.test(`/${rel}`) &&
      !exportsName(src, base) &&
      !rel.startsWith('tools/commands/')
    ) {
      add(
        f,
        1,
        'file-name',
        `no export named "${base}"; rename the file or its primary export so they match`,
      );
    }
    lines.forEach((l, i) => {
      if (/^\s*export\s+default\b/.test(l)) add(f, i + 1, 'no-default-export', 'use a named export');
      if (/^\s*@[A-Za-z_]\w*/.test(l))
        add(f, i + 1, 'no-decorators', 'decorators are not used in this codebase');
      const imp = /^\s*import\s.*from\s+'([^']+)'/.exec(l)?.[1];
      if (!imp) return;
      if (
        imp.startsWith('node:') &&
        !isTest &&
        !rel.startsWith('engine/node/') &&
        !rel.startsWith('tools/')
      ) {
        add(
          f,
          i + 1,
          'node-only',
          `"${imp}" is Node-only; keep it in engine/node/ or tools/ so the engine runs in browsers`,
        );
      }
      if (
        rel.startsWith('engine/') &&
        (imp.includes('/games/') || imp.startsWith('#games') || imp.includes('/tools/'))
      ) {
        add(f, i + 1, 'layering', 'engine code must not import games or tools');
      }
      if (
        rel.startsWith('engine/') &&
        rel !== 'engine/testing.ts' &&
        (imp === '#engine/api.ts' || /(^|\/)api\.ts$/.test(imp))
      ) {
        add(
          f,
          i + 1,
          'layering',
          'engine internals import modules by relative path, not the public api.ts barrel',
        );
      }
      if (
        rel.startsWith('games/') &&
        imp.startsWith('#engine/') &&
        imp !== '#engine/api.ts' &&
        !(isTest && imp === '#engine/testing.ts')
      ) {
        add(
          f,
          i + 1,
          'public-api',
          `games import the engine only via '#engine/api.ts' (tests may also use '#engine/testing.ts'), not "${imp}"`,
        );
      }
      if (rel.startsWith('games/') && /^(\.\.\/)+(engine|tools)\//.test(imp)) {
        add(f, i + 1, 'public-api', "use '#engine/api.ts' instead of a relative path into engine/");
      }
    });
  }
  const games = join(root, 'games');
  if (existsSync(games)) {
    for (const g of readdirSync(games)) {
      const dir = join(games, g, 'data', 'rooms');
      if (!existsSync(dir)) continue;
      for (const r of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
        if (!existsSync(join(dir, r.replace(/\.json$/, '.test.ts')))) {
          add(
            join(dir, r),
            1,
            'room-test',
            `room has no ${r.replace(/\.json$/, '.test.ts')}; every room is a headless test (copy a neighbor's test)`,
          );
        }
      }
    }
  }
  return issues;
}
