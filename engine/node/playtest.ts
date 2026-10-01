import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type { ContentFile } from '../content/ContentStore.ts';
import { gamePacks } from '../core/defineGame.ts';
import { Engine } from '../core/Engine.ts';
import { type BotActions, Playtest } from '../harness/Playtest.ts';
import type { SnapshotOpts } from '../harness/snapshot.ts';
import { ScriptedInput } from '../input/ScriptedInput.ts';
import { loadGame } from './loadGame.ts';
import { REPO_ROOT, readContentFiles } from './readContentFiles.ts';

export type PlaytestOptions = {
  seed?: number;
  tuning?: string[];
  /** Extra or replacement content files (tests can inject data). */
  files?: ContentFile[];
  actions?: Partial<BotActions>;
  /** Spawn point id in the room. */
  spawn?: string;
};

/** A Playtest that can also write captures to out/captures/<game>/<room>/<label>.json. */
export class NodePlaytest extends Playtest {
  /** Writes a snapshot to out/ and returns its repo-relative path. */
  capture(label: string, opts?: SnapshotOpts): string {
    const file = join(
      REPO_ROOT,
      'out',
      'captures',
      this.engine.game.name,
      this.engine.roomId,
      `${label}.json`,
    );
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(this.snapshot(opts), null, 1)}\n`);
    return relative(REPO_ROOT, file);
  }
}

/**
 * Boots a game headlessly from disk and loads a room (default: the game's start room).
 * Systems that throw fail the test immediately with a teaching error.
 */
export async function playtest(
  game: string,
  room?: string,
  opts: PlaytestOptions = {},
): Promise<NodePlaytest> {
  const def = await loadGame(game);
  const input = new ScriptedInput();
  const files = readContentFiles(gamePacks(def));
  for (const f of opts.files ?? []) {
    const i = files.findIndex((x) => x.path === f.path);
    if (i >= 0) files[i] = f;
    else files.push(f);
  }
  const engine = await Engine.create({
    game: def,
    files,
    input,
    mode: 'headless',
    seed: opts.seed ?? 1,
    onSystemError: 'throw',
    ...(opts.tuning ? { tuning: opts.tuning } : {}),
  });
  const errors = engine.content.errors();
  if (errors.length) throw errors[0];
  engine.loadRoom(room ?? def.startRoom, opts.spawn ? { spawn: opts.spawn } : {});
  return new NodePlaytest(engine, input, opts.actions);
}
