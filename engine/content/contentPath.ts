/** Where a content file sits: who owns it, which folder (kind), and its id. */
export type ContentPathInfo = {
  origin: 'engine' | 'game';
  game: string | undefined;
  folder: string;
  /** Path under the kind folder without `.json`; may contain `/` for sub-folders. */
  id: string;
};

const RE = /^(?:(engine)|games\/([^/]+))\/data\/([^/]+)\/(.+)\.json$/;

/** Parses a repo-relative content path, or returns undefined if it is not a content file. */
export function parseContentPath(path: string): ContentPathInfo | undefined {
  const m = RE.exec(path.replace(/\\/g, '/').replace(/^\/+/, ''));
  if (!m) return undefined;
  return { origin: m[1] ? 'engine' : 'game', game: m[2], folder: m[3]!, id: m[4]! };
}

/** Repo-relative path for a content id: `games/fps-demo/data/sounds/pistol.json`. */
export function contentFilePath(game: string | undefined, folder: string, id: string): string {
  return `${game ? `games/${game}` : 'engine'}/data/${folder}/${id}.json`;
}
