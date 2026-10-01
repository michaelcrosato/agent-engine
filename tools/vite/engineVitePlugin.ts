import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type { Plugin } from 'vite';
import { parseContentPath } from '../../engine/content/contentPath.ts';

/** Repo-relative content path check for the editor's save endpoint. */
function safeContentPath(path: string): boolean {
  return !path.includes('..') && !!parseContentPath(path);
}

/**
 * Dev-server glue for the engine:
 * - data file edits are pushed to the page as `engine:content` events (hot reload, no page reload)
 * - POST /__engine/save {path, text} writes a data file (used by the in-browser editor)
 */
export function engineVitePlugin(root: string): Plugin {
  return {
    name: 'agent-engine',
    async hotUpdate({ file, read, type }) {
      const rel = relative(root, file).replace(/\\/g, '/');
      if (!parseContentPath(rel)) return;
      if (type !== 'delete') this.environment.hot.send('engine:content', { path: rel, text: await read() });
      return [];
    },
    configureServer(server) {
      server.middlewares.use('/__engine/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        let body = '';
        req.on('data', (c: Buffer) => {
          body += c.toString();
        });
        req.on('end', () => {
          try {
            const { path, text } = JSON.parse(body) as { path: string; text: string };
            if (!safeContentPath(path))
              throw new Error(
                `Refusing to write "${path}": only data files under engine/data or games/<g>/data`,
              );
            JSON.parse(text);
            const abs = join(root, path);
            mkdirSync(dirname(abs), { recursive: true });
            writeFileSync(abs, text.endsWith('\n') ? text : `${text}\n`);
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: true, path }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
          }
        });
      });
    },
  };
}
