import { bootGame } from './bootGame.ts';
import { readUrlParams } from './readUrlParams.ts';
import { showLauncher } from './showLauncher.ts';

/** Browser entry (index.html): the launcher without ?game=, otherwise the game. */
export async function main(): Promise<void> {
  const root = document.getElementById('app')!;
  const params = readUrlParams();
  if (!params.game) {
    showLauncher(root);
    return;
  }
  try {
    await bootGame(params, root);
  } catch (err) {
    const pre = document.createElement('pre');
    pre.className = 'engine-fatal';
    pre.textContent = err instanceof Error ? err.message : String(err);
    root.appendChild(pre);
    throw err;
  }
}
