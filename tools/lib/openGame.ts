import { gamePacks } from '../../engine/core/defineGame.ts';
import { Engine } from '../../engine/core/Engine.ts';
import { EngineError } from '../../engine/core/EngineError.ts';
import { listGames, loadGame } from '../../engine/node/loadGame.ts';
import { readContentFiles } from '../../engine/node/readContentFiles.ts';

/** A headless engine for a game with content and registries loaded, but no room. */
export async function openGame(name: string): Promise<Engine> {
  const game = await loadGame(name);
  return Engine.create({
    game,
    files: readContentFiles(gamePacks(game)),
    mode: 'headless',
    onSystemError: 'throw',
  });
}

/**
 * Splits "game/room" (or "room" when there is exactly one game, or with an explicit game) into
 * parts. Throws a teaching error when the game is ambiguous.
 */
export function splitTarget(target: string, game?: string): { game: string; rest: string } {
  const slash = target.indexOf('/');
  const games = listGames();
  if (slash > 0 && games.includes(target.slice(0, slash)))
    return { game: target.slice(0, slash), rest: target.slice(slash + 1) };
  if (game) return { game, rest: target };
  if (games.length === 1) return { game: games[0]!, rest: target };
  throw new EngineError({
    code: 'TOOL_GAME_AMBIGUOUS',
    what: `Which game? "${target}" has no game prefix`,
    why: `Games: ${games.join(', ')}`,
    fix: `Write it as <game>/<id>, e.g. ${games[0] ?? 'fps-demo'}/${target}, or pass --game.`,
  });
}
