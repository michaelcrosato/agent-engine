/**
 * Data packs: folders that hold a `data/` tree. Later packs shadow earlier ones.
 * - "engine"           → engine/data/            (always included)
 * - "mechanics"        → engine/mechanics/data/  (included by mechanic plugins)
 * - "kit:<name>"       → engine/kits/<name>/data/ (included by kit plugins, e.g. "kit:fps")
 * - "game:<name>"      → games/<name>/data/      (the game itself, always last)
 */
export type ContentPathInfo = {
  pack: string;
  folder: string;
  /** Path under the kind folder without `.json`; may contain `/` for sub-folders. */
  id: string;
};

const RE =
  /^(?:(engine)|engine\/(mechanics)|engine\/kits\/([^/]+)|games\/([^/]+))\/data\/([^/]+)\/(.+)\.json$/;

/** Parses a repo-relative content path, or returns undefined if it is not a content file. */
export function parseContentPath(path: string): ContentPathInfo | undefined {
  const m = RE.exec(path.replace(/\\/g, '/').replace(/^\/+/, ''));
  if (!m) return undefined;
  const pack = m[1] ? 'engine' : m[2] ? 'mechanics' : m[3] ? `kit:${m[3]}` : `game:${m[4]}`;
  return { pack, folder: m[5]!, id: m[6]! };
}

/** Repo-relative data folder of a pack. */
export function packDir(pack: string): string {
  if (pack === 'engine') return 'engine/data';
  if (pack === 'mechanics') return 'engine/mechanics/data';
  if (pack.startsWith('kit:')) return `engine/kits/${pack.slice(4)}/data`;
  return `games/${pack.slice(5)}/data`;
}

/** Repo-relative path for a content id in a pack: `games/fps-demo/data/sounds/pistol.json`. */
export function contentFilePath(pack: string, folder: string, id: string): string {
  return `${packDir(pack)}/${folder}/${id}.json`;
}
