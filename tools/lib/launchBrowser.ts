import { existsSync } from 'node:fs';
import { type Browser, chromium } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { EngineError } from '../../engine/core/EngineError.ts';
import { ROOT } from './outPath.ts';

/** Where to find a Chromium: $ENGINE_CHROMIUM, Playwright's own download, or a sandbox install. */
export function chromiumPath(): string | undefined {
  const candidates = [
    process.env.ENGINE_CHROMIUM,
    safe(() => chromium.executablePath()),
    '/opt/pw-browsers/chromium',
  ];
  return candidates.find((p) => p && existsSync(p));
}

function safe(fn: () => string): string | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

/** Headless Chromium with software WebGL (works without a GPU). */
export async function launchBrowser(): Promise<Browser> {
  const executablePath = chromiumPath();
  if (!executablePath) {
    throw new EngineError({
      code: 'BROWSER_MISSING',
      what: 'No Chromium found for screenshots',
      why: 'Playwright browsers are not installed and $ENGINE_CHROMIUM is not set.',
      fix: 'Run: npx playwright install chromium   (or set ENGINE_CHROMIUM=/path/to/chrome)',
    });
  }
  return chromium.launch({
    executablePath,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
}

/** Starts the Vite dev server on a free port, or returns a handle for an existing URL. */
export async function startServer(url?: string): Promise<{ url: string; close(): Promise<void> }> {
  if (url) return { url: url.replace(/\/$/, ''), close: async () => {} };
  const server: ViteDevServer = await createServer({
    root: ROOT,
    logLevel: 'error',
    server: { port: 0, strictPort: false },
  });
  await server.listen();
  const local = server.resolvedUrls?.local[0] ?? `http://localhost:${server.config.server.port}/`;
  return { url: local.replace(/\/$/, ''), close: () => server.close() };
}
