import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GameDef } from '../core/defineGame.ts';
import { EngineError } from '../core/EngineError.ts';
import { didYouMean } from '../core/suggest.ts';
import { REPO_ROOT } from './readContentFiles.ts';

/** Names of folders under games/ that have a game.ts. */
export function listGames(root = REPO_ROOT): string[] {
  const dir = join(root, 'games');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => existsSync(join(dir, n, 'game.ts')))
    .sort();
}

/** Imports games/<name>/game.ts and returns its exported `game` definition. */
export async function loadGame(name: string, root = REPO_ROOT): Promise<GameDef> {
  const file = join(root, 'games', name, 'game.ts');
  if (!existsSync(file)) {
    throw new EngineError({
      code: 'GAME_NOT_FOUND',
      what: `No game "${name}"`,
      where: { file: `games/${name}/game.ts` },
      why: didYouMean(name, listGames(root)),
      fix: `Create it with: npm run new -- game ${name}`,
    });
  }
  const mod = (await import(pathToFileURL(file).href)) as { game?: GameDef };
  if (mod.game?.kind !== 'game') {
    throw new EngineError({
      code: 'GAME_EXPORT_MISSING',
      what: `games/${name}/game.ts does not export \`game\``,
      where: { file: `games/${name}/game.ts` },
      fix: 'Add: export const game = defineGame({ ... });',
    });
  }
  return mod.game;
}
