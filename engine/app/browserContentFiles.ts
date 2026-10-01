import type { ContentFile } from '../content/ContentStore.ts';
import { parseContentPath } from '../content/contentPath.ts';

/** Every data file bundled by Vite (raw text), filtered to the game's data packs. */
export function browserContentFiles(packs: readonly string[]): ContentFile[] {
  const all = {
    ...import.meta.glob('/engine/data/**/*.json', { query: '?raw', import: 'default', eager: true }),
    ...import.meta.glob('/engine/mechanics/data/**/*.json', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
    ...import.meta.glob('/engine/kits/*/data/**/*.json', { query: '?raw', import: 'default', eager: true }),
    ...import.meta.glob('/games/*/data/**/*.json', { query: '?raw', import: 'default', eager: true }),
  };
  const out: ContentFile[] = [];
  for (const [path, text] of Object.entries(all)) {
    const p = path.replace(/^\//, '');
    const info = parseContentPath(p);
    if (info && packs.includes(info.pack)) out.push({ path: p, text: text as string });
  }
  return out;
}

/** Room ids per game, for the launcher. */
export function browserRoomIndex(): Record<string, string[]> {
  const rooms = import.meta.glob('/games/*/data/rooms/**/*.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const out: Record<string, string[]> = {};
  for (const path of Object.keys(rooms)) {
    const m = /^\/games\/([^/]+)\/data\/rooms\/(.+)\.json$/.exec(path);
    if (!m) continue;
    (out[m[1]!] ??= []).push(m[2]!);
  }
  return out;
}
