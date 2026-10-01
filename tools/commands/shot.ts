import { z } from 'zod';
import { defineTool } from '../lib/defineTool.ts';
import { launchBrowser, startServer } from '../lib/launchBrowser.ts';
import { splitTarget } from '../lib/openGame.ts';
import { outPath } from '../lib/outPath.ts';

export const shotTool = defineTool({
  name: 'shot',
  summary: 'Screenshot a room in headless Chromium (player view, overhead map view, or any camera).',
  usage:
    "npm run shot -- <game>/<room> [--views player,top] [--frames 30] [--steps '[...]'] [--look neon]\n" +
    '       [--cam x,y,z --at x,y,z] [--size 1280x720] [--url http://localhost:5173]\n' +
    '  e.g. npm run shot -- fps-demo/arena --views player,top',
  args: z.object({
    target: z.string().meta({ description: 'game/room' }),
    views: z
      .array(z.string())
      .default(['player'])
      .meta({ description: 'player, top (overhead), cam (needs --cam/--at)' }),
    frames: z.number().int().min(0).default(30).meta({ description: 'Ticks simulated before capture' }),
    steps: z.string().optional().meta({ description: 'JSON playtest steps to run before capture' }),
    look: z.string().optional().meta({ description: 'Override the room look' }),
    cam: z.string().optional().meta({ description: 'Camera position "x,y,z"' }),
    at: z.string().optional().meta({ description: 'Camera target "x,y,z"' }),
    size: z.string().default('1280x720'),
    url: z.string().optional().meta({ description: 'Use an already running dev server' }),
  }),
  positional: ['target'],
  async run(a, io) {
    const { game, rest: room } = splitTarget(a.target);
    const [width, height] = a.size.split('x').map(Number) as [number, number];
    io.progress('starting dev server');
    const server = await startServer(a.url);
    const browser = await launchBrowser();
    const files: string[] = [];
    const lines: string[] = [];
    let ok = true;
    try {
      const page = await browser.newPage({ viewport: { width, height } });
      for (const view of a.views) {
        const q = new URLSearchParams({ game, room, shot: '1', frames: String(a.frames) });
        if (view === 'top') q.set('view', 'top');
        if (view === 'cam' && a.cam) q.set('cam', a.cam);
        if (view === 'cam' && a.at) q.set('at', a.at);
        if (a.look) q.set('look', a.look);
        if (a.steps) q.set('steps', a.steps);
        io.progress(`rendering ${view}`);
        await page.goto(`${server.url}/?${q}`);
        await page.waitForFunction(() => window.__engine?.ready, null, { timeout: 120_000 });
        const errors = await page.evaluate(() => window.__engine?.errors() ?? []);
        const rel = `shots/${game}-${room.replace(/\//g, '_')}-${view}.png`;
        await page.screenshot({ path: outPath(rel) });
        files.push(`out/${rel}`);
        ok &&= errors.length === 0;
        lines.push(`${view}: ${errors.length ? `${errors.length} errors (shown on screen too)` : 'ok'}`);
        for (const e of errors.slice(0, 3)) lines.push(e.replace(/^/gm, '  '));
      }
    } finally {
      await browser.close();
      await server.close();
    }
    return {
      ok,
      summary: `${game}/${room} (${width}×${height}, ${a.frames} ticks)\n${lines.join('\n')}`,
      files,
    };
  },
});
