import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import { listGames } from '../../engine/node/loadGame.ts';
import { defineTool } from '../lib/defineTool.ts';
import { outPath } from '../lib/outPath.ts';
import { validateGame } from '../lib/validateGame.ts';

export const validateTool = defineTool({
  name: 'validate',
  summary:
    'Validate all data of one or all games: schemas, references, prefabs, and every room built headlessly.',
  usage: 'npm run tool -- validate [game]\n  e.g. npm run tool -- validate fps-demo',
  args: z.object({ game: z.string().optional().meta({ description: 'Only this game (default: all)' }) }),
  positional: ['game'],
  async run(a) {
    const lines: string[] = [];
    const files: string[] = [];
    let ok = true;
    for (const g of a.game ? [a.game] : listGames()) {
      const r = await validateGame(g);
      const rel = `out/check/content-${g}.json`;
      mkdirSync(dirname(outPath(`check/content-${g}.json`)), { recursive: true });
      writeFileSync(
        outPath(`check/content-${g}.json`),
        JSON.stringify(
          r.errors.map((e) => e.toJSON()),
          null,
          1,
        ),
      );
      files.push(rel);
      ok &&= r.errors.length === 0;
      lines.push(
        `${r.errors.length ? '✖' : '✓'} ${g}: ${r.files} files, ${r.prefabs} prefabs, ${r.rooms} rooms, ${r.errors.length} errors`,
      );
      for (const e of r.errors.slice(0, 8)) lines.push(e.message.replace(/^/gm, '  '));
      if (r.errors.length > 8) lines.push(`  … ${r.errors.length - 8} more in ${rel}`);
    }
    return { ok, summary: lines.join('\n'), files };
  },
});
