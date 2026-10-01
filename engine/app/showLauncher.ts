import { browserRoomIndex } from './browserContentFiles.ts';
import { gameNames } from './loadBrowserGame.ts';

/** Start page: every game and room as links (`?game=<g>&room=<r>`). */
export function showLauncher(root: HTMLElement): void {
  const rooms = browserRoomIndex();
  const box = document.createElement('div');
  box.className = 'engine-launcher';
  const h = document.createElement('h1');
  h.textContent = 'Agent Engine';
  box.appendChild(h);
  for (const g of gameNames()) {
    const sec = document.createElement('section');
    const title = document.createElement('h2');
    const play = document.createElement('a');
    play.href = `?game=${g}`;
    play.textContent = g;
    title.appendChild(play);
    sec.appendChild(title);
    const list = document.createElement('ul');
    for (const r of (rooms[g] ?? []).sort()) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `?game=${g}&room=${encodeURIComponent(r)}`;
      a.textContent = r;
      const edit = document.createElement('a');
      edit.href = `?game=${g}&room=${encodeURIComponent(r)}&edit=1`;
      edit.textContent = 'edit';
      edit.className = 'edit';
      li.append(a, ' ', edit);
      list.appendChild(li);
    }
    sec.appendChild(list);
    box.appendChild(sec);
  }
  root.appendChild(box);
}
