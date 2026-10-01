import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { contentFilePath } from '../../engine/content/contentPath.ts';
import { EngineError } from '../../engine/core/EngineError.ts';
import { listGames } from '../../engine/node/loadGame.ts';
import { defineTool } from '../lib/defineTool.ts';
import { ROOT } from '../lib/outPath.ts';

const DATA_KINDS: Record<string, string> = {
  look: 'looks',
  sound: 'sounds',
  prefab: 'prefabs',
  puppet: 'puppets',
  clip: 'clips',
  texture: 'textures',
  music: 'music',
  effect: 'effects',
  tuning: 'tuning',
  post: 'post',
};
const KINDS = [
  'game',
  'room',
  'mechanic',
  'component',
  'system',
  'tool',
  ...Object.keys(DATA_KINDS),
] as const;

const pascal = (s: string) => s.replace(/(^|[-_\s/])(\w)/g, (_, __, c: string) => c.toUpperCase());
const kebab = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
const camel = (s: string) => pascal(s).replace(/^\w/, (c) => c.toLowerCase());

type Vars = Record<string, string>;

function fill(template: string, v: Vars): string {
  return template.replace(/__(\w+)__/g, (m, k: string) => v[k] ?? m);
}

function writeNew(rel: string, text: string, force: boolean, created: string[]): void {
  const abs = join(ROOT, rel);
  if (existsSync(abs) && !force) {
    throw new EngineError({
      code: 'NEW_EXISTS',
      what: `${rel} already exists`,
      fix: 'Pick another name, or pass --force to overwrite.',
    });
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text.endsWith('\n') ? text : `${text}\n`);
  created.push(rel);
}

const tpl = (rel: string) => readFileSync(join(ROOT, 'templates', rel), 'utf8');

export const newTool = defineTool({
  name: 'new',
  summary: 'Scaffold a game, room, mechanic, component, system, tool, or data file from templates.',
  usage:
    'npm run new -- <kind> <name> [--game g] [--from existing-id] [--mechanic dir] [--engine] [--doc "..."] [--force]\n' +
    `  kinds: ${KINDS.join(', ')}\n` +
    '  e.g. npm run new -- room vault --from arena     npm run new -- mechanic jetpack     npm run new -- sound zap',
  args: z.object({
    kind: z.enum(KINDS),
    name: z.string().min(1),
    game: z.string().optional().meta({ description: 'Target game (default: the only game)' }),
    from: z
      .string()
      .optional()
      .meta({ description: 'Copy this existing room/data id instead of the template' }),
    mechanic: z.string().optional().meta({ description: 'component/system: mechanic folder to put it in' }),
    engine: z
      .boolean()
      .default(false)
      .meta({ description: 'Data kinds: create in engine/data instead of the game' }),
    doc: z.string().default('').meta({ description: 'One-line description' }),
    force: z.boolean().default(false),
  }),
  positional: ['kind', 'name'],
  async run(a) {
    const game = a.kind === 'game' ? a.name : (a.game ?? listGames()[0] ?? 'game');
    const v: Vars = {
      name: kebab(a.name),
      Name: pascal(a.name),
      camel: camel(a.name),
      game,
      doc: a.doc || `TODO: describe ${a.name}`,
    };
    const created: string[] = [];
    const next: string[] = [];
    const f = a.force;
    if (a.kind === 'game') {
      writeNew(`games/${v.name}/game.ts`, fill(tpl('game/game.ts.tpl'), v), f, created);
      writeNew(`games/${v.name}/data/rooms/start.json`, fill(tpl('game/start.json.tpl'), v), f, created);
      writeNew(
        `games/${v.name}/data/rooms/start.test.ts`,
        fill(tpl('game/start.test.ts.tpl'), v),
        f,
        created,
      );
      next.push(`Play it: npm run dev, then open ?game=${v.name}`, `Test it: npm run check`);
    } else if (a.kind === 'room') {
      const dir = `games/${game}/data/rooms`;
      const src = a.from ? join(ROOT, dir, `${a.from}.json`) : '';
      if (a.from && !existsSync(src))
        throw new EngineError({ code: 'NEW_FROM_MISSING', what: `No room ${dir}/${a.from}.json to copy` });
      const json = a.from ? readFileSync(src, 'utf8') : fill(tpl('room/room.json.tpl'), v);
      writeNew(`${dir}/${v.name}.json`, json, f, created);
      const srcTest = a.from ? join(ROOT, dir, `${a.from}.test.ts`) : '';
      const test =
        srcTest && existsSync(srcTest)
          ? readFileSync(srcTest, 'utf8')
              .replaceAll(`'${a.from}'`, `'${v.name}'`)
              .replaceAll(`/${a.from}`, `/${v.name}`)
          : fill(tpl('room/room.test.ts.tpl'), v);
      writeNew(`${dir}/${v.name}.test.ts`, test, f, created);
      next.push(
        `See it: npm run shot -- ${game}/${v.name} --views player,top`,
        `Map: npm run tool -- map ${game}/${v.name}`,
      );
    } else if (a.kind === 'mechanic') {
      const dir = `games/${game}/mechanics/${v.name}`;
      const mv = { ...v, Comp: v.Name! };
      writeNew(`${dir}/${v.Name}.ts`, fill(tpl('mechanic/Component.ts.tpl'), mv), f, created);
      writeNew(
        `${dir}/${v.Name}System.ts`,
        fill(tpl('mechanic/System.ts.tpl'), { ...mv, Name: `${v.Name}System` }),
        f,
        created,
      );
      writeNew(`${dir}/${v.Name}Plugin.ts`, fill(tpl('mechanic/Plugin.ts.tpl'), mv), f, created);
      writeNew(`${dir}/${v.name}.test.ts`, fill(tpl('mechanic/mechanic.test.ts.tpl'), mv), f, created);
      next.push(
        `Register it in games/${game}/game.ts: import { ${v.Name}Plugin } from './mechanics/${v.name}/${v.Name}Plugin.ts'; plugins: [...fpsKit(), ${v.Name}Plugin]`,
      );
    } else if (a.kind === 'component' || a.kind === 'system') {
      const folder = kebab(a.mechanic ?? a.name.replace(/System$/, ''));
      const dir = `games/${game}/mechanics/${folder}`;
      const comp = pascal(a.name.replace(/System$/, ''));
      if (a.kind === 'component')
        writeNew(
          `${dir}/${comp}.ts`,
          fill(tpl('component/Component.ts.tpl'), { ...v, Name: comp }),
          f,
          created,
        );
      else
        writeNew(
          `${dir}/${comp}System.ts`,
          fill(tpl('system/System.ts.tpl'), { ...v, Name: `${comp}System`, Comp: comp }),
          f,
          created,
        );
      next.push(
        `Add it to its plugin's ${a.kind === 'component' ? 'components' : 'systems'} list (e.g. ${dir}/*Plugin.ts).`,
      );
    } else if (a.kind === 'tool') {
      writeNew(`tools/commands/${v.name}.ts`, fill(tpl('tool/tool.ts.tpl'), v), f, created);
      const reg = join(ROOT, 'tools', 'tools.ts');
      const text = readFileSync(reg, 'utf8')
        .replace(
          'import type { ToolDef }',
          `import { ${v.camel}Tool } from './commands/${v.name}.ts';\nimport type { ToolDef }`,
        )
        .replace(/(export const TOOLS: readonly ToolDef\[\] = \[)/, `$1${v.camel}Tool, `);
      writeFileSync(reg, text);
      created.push('tools/tools.ts (registered)');
      next.push(`Run it: npm run tool -- ${v.name} --help (also available over MCP)`);
    } else {
      const folder = DATA_KINDS[a.kind]!;
      const pack = a.engine ? 'engine' : `game:${game}`;
      const rel = contentFilePath(pack, folder, a.name);
      let text = fill(tpl(`data/${a.kind}.json.tpl`), v);
      if (a.from) {
        const src = [
          contentFilePath(pack, folder, a.from),
          contentFilePath('engine', folder, a.from),
          contentFilePath('mechanics', folder, a.from),
          contentFilePath('kit:fps', folder, a.from),
        ].find((p) => existsSync(join(ROOT, p)));
        if (!src)
          throw new EngineError({
            code: 'NEW_FROM_MISSING',
            what: `No ${a.kind} "${a.from}" to copy`,
            fix: `List them: npm run tool -- list ${a.kind}`,
          });
        text = readFileSync(join(ROOT, src), 'utf8');
      }
      writeNew(rel, text, f, created);
      if (a.kind === 'sound') next.push(`Hear it (WAV + spectrogram): npm run sfx -- ${a.name}`);
      if (a.kind === 'texture') next.push(`See it: npm run tex -- ${a.name}`);
      if (a.kind === 'music') next.push(`Hear it: npm run music -- ${a.name}`);
    }
    next.push('Validate: npm run check');
    return {
      ok: true,
      summary: `created ${a.kind} "${a.name}"\nnext:\n${next.map((n) => `  ${n}`).join('\n')}`,
      files: created,
    };
  },
});
