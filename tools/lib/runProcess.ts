import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from './outPath.ts';

/** Runs a repo-local binary (node_modules/.bin/<bin>) and captures combined output. */
export function runProcess(
  bin: string,
  args: readonly string[],
): Promise<{ code: number; out: string; ms: number }> {
  const t0 = performance.now();
  return new Promise((resolve) => {
    const child = spawn(join(ROOT, 'node_modules', '.bin', bin), args, {
      cwd: ROOT,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    });
    let out = '';
    child.stdout.on('data', (d: Buffer) => {
      out += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      out += d.toString();
    });
    child.on('close', (code) => resolve({ code: code ?? 1, out, ms: performance.now() - t0 }));
  });
}
