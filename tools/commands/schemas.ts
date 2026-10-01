import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { listGames } from '../../engine/node/loadGame.ts';
import { defineTool } from '../lib/defineTool.ts';
import { generateSchemas } from '../lib/generateSchemas.ts';
import { openGame } from '../lib/openGame.ts';
import { ROOT } from '../lib/outPath.ts';

/** Regenerates schema-derived files; returns which ones changed. */
export async function writeSchemas(): Promise<{ total: number; changed: string[] }> {
  const engines = await Promise.all(listGames().map((g) => openGame(g)));
  const files = generateSchemas(engines);
  const changed: string[] = [];
  for (const [rel, text] of files) {
    const abs = join(ROOT, rel);
    if (existsSync(abs) && readFileSync(abs, 'utf8') === text) continue;
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text);
    changed.push(rel);
  }
  return { total: files.size, changed };
}

export const schemasTool = defineTool({
  name: 'schemas',
  summary: 'Regenerate JSON Schemas (editor autocomplete) and reference docs from the code schemas.',
  usage: 'npm run tool -- schemas',
  args: z.object({}),
  async run() {
    const r = await writeSchemas();
    return {
      ok: true,
      summary: `${r.total} schema-derived files, ${r.changed.length} updated`,
      files: r.changed,
    };
  },
});
