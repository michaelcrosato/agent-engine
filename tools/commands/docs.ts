import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { defineTool } from '../lib/defineTool.ts';
import { ROOT } from '../lib/outPath.ts';

/** Repo-relative markdown files the docs tool reads: AGENTS.md and everything under docs/. */
function docFiles(dir = join(ROOT, 'docs'), prefix = 'docs/'): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory()
      ? docFiles(join(dir, d.name), `${prefix}${d.name}/`)
      : d.name.endsWith('.md')
        ? [`${prefix}${d.name}`]
        : [],
  );
}

export const docsTool = defineTool({
  name: 'docs',
  summary: 'Show the docs index, print one doc, or search all docs for a phrase.',
  usage:
    'npm run docs [-- <doc name | search words>]\n  e.g. npm run docs    npm run docs -- rooms    npm run docs -- "signal"',
  args: z.object({
    query: z.string().default('').meta({ description: 'Doc name (e.g. rooms) or words to search' }),
  }),
  positional: ['query'],
  async run(a) {
    const files = ['AGENTS.md', ...docFiles()];
    if (!a.query) return { ok: true, summary: readFileSync(join(ROOT, 'docs', 'README.md'), 'utf8') };
    const exact = files.find((f) => f === `${a.query}.md` || f.endsWith(`/${a.query}.md`));
    if (exact) return { ok: true, summary: readFileSync(join(ROOT, exact), 'utf8') };
    const q = a.query.toLowerCase();
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(join(ROOT, f), 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (hits.length < 30 && line.toLowerCase().includes(q))
            hits.push(`${f}:${i + 1}  ${line.trim().slice(0, 160)}`);
        });
    }
    return {
      ok: hits.length > 0,
      summary: hits.join('\n') || `No docs mention "${a.query}". Index: npm run docs`,
    };
  },
});
