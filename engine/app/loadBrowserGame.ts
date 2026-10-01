import type { GameDef } from '../core/defineGame.ts';
import { EngineError } from '../core/EngineError.ts';
import { didYouMean } from '../core/suggest.ts';

const modules = import.meta.glob<{ game: GameDef }>('/games/*/game.ts');

export function gameNames(): string[] {
  return Object.keys(modules)
    .map((p) => p.split('/')[2]!)
    .sort();
}

/** Lazily imports games/<name>/game.ts in the browser. */
export async function loadBrowserGame(name: string): Promise<GameDef> {
  const load = modules[`/games/${name}/game.ts`];
  if (!load) {
    throw new EngineError({
      code: 'GAME_NOT_FOUND',
      what: `No game "${name}"`,
      why: didYouMean(name, gameNames()),
      fix: `Create it with: npm run new -- game ${name}`,
    });
  }
  return (await load()).game;
}
