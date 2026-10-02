import { z } from 'zod';
import { listGames } from '../../engine/node/loadGame.ts';
import { defineTool } from '../lib/defineTool.ts';
import { openGame } from '../lib/openGame.ts';

const WHAT = ['games', 'kinds', 'components', 'systems', 'plugins', 'events'] as const;

export const listTool = defineTool({
  name: 'list',
  summary: 'List games, kinds, components, systems, plugins, events, or content ids of a kind.',
  usage:
    'npm run tool -- list <what> [--game agent-engine]\n' +
    '  what: games | kinds | components | systems | plugins | events | <kind> (sound, prefab, room, ...)\n' +
    '  e.g. npm run tool -- list components    npm run tool -- list sound --game agent-engine',
  args: z.object({
    what: z
      .string()
      .default('games')
      .meta({ description: `${WHAT.join(', ')}, or a content kind name` }),
    game: z.string().optional().meta({ description: 'Game to inspect (default: the only game)' }),
  }),
  positional: ['what'],
  async run(a) {
    const games = listGames();
    if (a.what === 'games')
      return { ok: true, summary: games.join('\n') || '(no games yet: npm run new -- game <name>)' };
    const engine = await openGame(a.game ?? games[0]!);
    let lines: string[];
    if (a.what === 'kinds')
      lines = engine.content.kindList().map((k) => `${k.name.padEnd(8)} data/${k.folder}/  — ${k.doc}`);
    else if (a.what === 'components')
      lines = engine.componentTypes().map((c) => `${c.name.padEnd(16)} — ${c.doc}`);
    else if (a.what === 'plugins') lines = engine.game.plugins.map((p) => `${p.name.padEnd(12)} — ${p.doc}`);
    else if (a.what === 'events')
      lines = engine.game.plugins.flatMap((p) =>
        p.events.map((e) => `${e.name.padEnd(16)} (${p.name}) — ${e.doc}`),
      );
    else if (a.what === 'systems') {
      lines = (['input', 'update', 'physics', 'late', 'frame'] as const).flatMap((ph) =>
        engine.systemsIn(ph).map((s) => `${ph.padEnd(8)} ${s.name.padEnd(24)} — ${s.doc}`),
      );
    } else {
      const kind =
        engine.content.kindList().find((k) => k.name === a.what || k.folder === a.what) ??
        engine.content.kind(a.what);
      lines = engine.content.ids(kind).map((id) => {
        const e = engine.content.entry(kind, id)!;
        const doc = (e.raw as { doc?: string } | undefined)?.doc ?? '';
        return `${id.padEnd(20)} ${e.pack.padEnd(14)} ${e.errors.length ? '✖ invalid ' : ''}${doc}`;
      });
    }
    return { ok: true, summary: lines.join('\n') || '(none)', details: lines };
  },
});
