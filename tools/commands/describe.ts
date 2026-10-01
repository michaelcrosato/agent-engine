import { z } from 'zod';
import { EngineError } from '../../engine/core/EngineError.ts';
import { didYouMean } from '../../engine/core/suggest.ts';
import { listGames } from '../../engine/node/loadGame.ts';
import { resolvePrefab } from '../../engine/prefab/resolvePrefab.ts';
import { defineTool } from '../lib/defineTool.ts';
import { openGame } from '../lib/openGame.ts';
import { schemaTable } from '../lib/schemaTable.ts';

export const describeTool = defineTool({
  name: 'describe',
  summary: 'Show the fields of a component or content kind, or a resolved prefab.',
  usage:
    'npm run tool -- describe <Component | kind | prefab:<id>> [--game fps-demo]\n' +
    '  e.g. describe Health    describe sound    describe prefab:grunt',
  args: z.object({
    thing: z.string().meta({ description: 'Component name, kind name, or prefab:<id>' }),
    game: z.string().optional(),
  }),
  positional: ['thing'],
  async run(a) {
    const engine = await openGame(a.game ?? listGames()[0]!);
    if (a.thing.startsWith('prefab:')) {
      const id = a.thing.slice(7);
      const p = resolvePrefab(engine.content, id);
      const out = [`prefab "${id}" (${p.lineage.join(' ← ')})  tags: ${p.tags.join(', ') || '-'}`];
      for (const [name, json] of Object.entries(p.components)) out.push(`  ${name}: ${JSON.stringify(json)}`);
      return { ok: true, summary: out.join('\n'), details: p };
    }
    const comp = engine.componentTypes().find((c) => c.name === a.thing);
    if (comp)
      return {
        ok: true,
        summary: [`component ${comp.name} — ${comp.doc}`, ...schemaTable(comp.schema)].join('\n'),
      };
    const kind = engine.content.kindList().find((k) => k.name === a.thing);
    if (kind)
      return {
        ok: true,
        summary: [
          `kind ${kind.name} (data/${kind.folder}/<id>.json) — ${kind.doc}`,
          ...schemaTable(kind.schema),
        ].join('\n'),
      };
    const kinds = engine.content.kindList().filter((k) => engine.content.entry(k, a.thing));
    if (kinds.length)
      throw new EngineError({
        code: 'DESCRIBE_UNKNOWN',
        what: `"${a.thing}" is a ${kinds.map((k) => k.name).join(' and a ')} id, not a component or kind`,
        fix: kinds.some((k) => k.name === 'prefab')
          ? `Resolved prefab: npm run tool -- describe prefab:${a.thing}`
          : `Its schema: npm run tool -- describe ${kinds[0]!.name}`,
      });
    throw new EngineError({
      code: 'DESCRIBE_UNKNOWN',
      what: `Nothing named "${a.thing}"`,
      why: didYouMean(a.thing, [
        ...engine.componentTypes().map((c) => c.name),
        ...engine.content.kindList().map((k) => k.name),
      ]),
      fix: 'List options with: npm run tool -- list components  (or: list kinds)',
    });
  },
});
