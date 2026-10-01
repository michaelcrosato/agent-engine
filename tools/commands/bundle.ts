import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { build } from 'vite';
import { z } from 'zod';
import { EngineError } from '../../engine/core/EngineError.ts';
import { didYouMean } from '../../engine/core/suggest.ts';
import { listGames } from '../../engine/node/loadGame.ts';
import { defineTool } from '../lib/defineTool.ts';
import { outPath, ROOT } from '../lib/outPath.ts';

/** Inline script text must not close or comment out its own <script> element. */
const safeScript = (js: string) => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

/** Replaces the built page's script and stylesheet references with their contents. */
function inlineAssets(html: string, dir: string): string {
  const read = (src: string) => readFileSync(join(dir, src.replace(/^\.?\//, '')), 'utf8');
  return html
    .replace(/<link rel="modulepreload"[^>]*>\s*/g, '')
    .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_, src: string) => {
      return `<script type="module">${safeScript(read(src))}</script>`;
    })
    .replace(
      /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
      (_, href: string) => `<style>${read(href)}</style>`,
    );
}

export const bundleTool = defineTool({
  name: 'bundle',
  summary: 'Build a game into one self-contained HTML file (no server, works offline and on phones).',
  usage:
    'npm run tool -- bundle <game> [--room <id>]\n' +
    '  e.g. npm run tool -- bundle fps-demo   → out/bundle/fps-demo.html (touch controls on phones)',
  args: z.object({
    game: z.string().min(1),
    room: z.string().default('').meta({ description: 'Room to start in (default: the game start room)' }),
  }),
  positional: ['game'],
  async run(a) {
    if (!listGames().includes(a.game)) {
      throw new EngineError({
        code: 'BUNDLE_NO_GAME',
        what: `No game "${a.game}"`,
        why: didYouMean(a.game, listGames()),
        fix: 'List games: npm run tool -- list games',
      });
    }
    const tmp = outPath('bundle/.build');
    const env = { game: process.env.VITE_ENGINE_GAME, room: process.env.VITE_ENGINE_ROOM };
    process.env.VITE_ENGINE_GAME = a.game;
    process.env.VITE_ENGINE_ROOM = a.room;
    try {
      await build({
        root: ROOT,
        logLevel: 'error',
        build: {
          outDir: tmp,
          emptyOutDir: true,
          modulePreload: false,
          assetsInlineLimit: Number.MAX_SAFE_INTEGER,
          chunkSizeWarningLimit: Number.MAX_SAFE_INTEGER,
          rolldownOptions: { output: { codeSplitting: false } },
        },
      });
    } finally {
      if (env.game === undefined) delete process.env.VITE_ENGINE_GAME;
      else process.env.VITE_ENGINE_GAME = env.game;
      if (env.room === undefined) delete process.env.VITE_ENGINE_ROOM;
      else process.env.VITE_ENGINE_ROOM = env.room;
    }
    const html = inlineAssets(readFileSync(join(tmp, 'index.html'), 'utf8'), tmp);
    const leftover = /(?:src|href)="[^"]*assets\/[^"]+"/.exec(html);
    if (leftover) {
      throw new EngineError({
        code: 'BUNDLE_NOT_SELF_CONTAINED',
        what: `The bundled page still references a separate file: ${leftover[0]}`,
        fix: 'Inline that asset kind in tools/commands/bundle.ts (inlineAssets).',
      });
    }
    const file = outPath(`bundle/${a.game}.html`);
    mkdirSync(outPath('bundle'), { recursive: true });
    writeFileSync(file, html);
    if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
    const mb = (Buffer.byteLength(html) / 1e6).toFixed(1);
    return {
      ok: true,
      summary:
        `${relative(ROOT, file)} (${mb} MB): open it in any modern browser, no server needed.\n` +
        'Touch screens get on-screen controls (left thumb moves, right thumb looks, buttons act).',
      files: [relative(ROOT, file)],
    };
  },
});
