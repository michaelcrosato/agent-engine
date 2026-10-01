import { EngineError, type ErrorWhere } from '../core/EngineError.ts';
import { didYouMean } from '../core/suggest.ts';
import { validate } from '../schema/validate.ts';
import { contentFilePath, parseContentPath } from './contentPath.ts';
import type { ContentKind, ContentValue } from './defineContentKind.ts';
import { type ParsedJson, parseJson } from './parseJson.ts';

/** A raw content file: repo-relative path and its text. */
export type ContentFile = { path: string; text: string };

/** One loaded content item. `value` is set only when it parsed and validated. */
export type ContentEntry = {
  kind: ContentKind;
  id: string;
  file: string;
  /** Data pack the file came from: "engine", "mechanics", "kit:<name>", "game:<name>". */
  pack: string;
  /** JSON as written (minus `$schema`), for the editor and tools. */
  raw: unknown;
  parsed: ParsedJson | undefined;
  value: unknown;
  errors: EngineError[];
};

/**
 * All data files visible to one game, from its data packs in precedence order
 * (engine → mechanics → kits → game; later packs shadow earlier ones with the same kind and id).
 * Files are parsed and validated on load; errors are collected (see `errors()`) so one bad
 * file never blocks the rest.
 */
export class ContentStore {
  private readonly kinds = new Map<string, ContentKind>();
  private readonly byFolder = new Map<string, ContentKind>();
  private readonly items = new Map<string, Map<string, ContentEntry>>();
  private readonly shadowed: ContentEntry[] = [];
  private readonly stray: EngineError[] = [];
  /** Packs in precedence order (last wins). */
  readonly packs: readonly string[];

  constructor(kinds: readonly ContentKind[], files: readonly ContentFile[], packs: readonly string[]) {
    this.packs = packs;
    for (const k of kinds) {
      this.kinds.set(k.name, k);
      this.byFolder.set(k.folder, k);
      this.items.set(k.name, new Map());
    }
    const rank = (f: ContentFile) => this.packs.indexOf(parseContentPath(f.path)?.pack ?? '');
    for (const f of [...files].sort((a, b) => rank(a) - rank(b))) this.upsert(f);
  }

  /** The game pack ("game:<name>") if any: where new game content should be created. */
  get gamePack(): string | undefined {
    return this.packs.find((p) => p.startsWith('game:'));
  }

  /** Adds or replaces a file (hot reload). Returns the entry, or undefined if not content. */
  upsert(file: ContentFile): ContentEntry | undefined {
    const info = parseContentPath(file.path);
    if (!info || !this.packs.includes(info.pack)) return undefined;
    const kind = this.byFolder.get(info.folder);
    if (!kind && info.pack !== this.gamePack) return undefined;
    if (!kind) {
      this.stray.push(
        new EngineError({
          code: 'CONTENT_FOLDER_UNKNOWN',
          what: `Folder "data/${info.folder}" is not a content kind`,
          where: { file: file.path },
          why: didYouMean(info.folder, this.byFolder.keys()),
          fix: 'Move the file into a known kind folder (npm run tool -- list kinds).',
        }),
      );
      return undefined;
    }
    const entry: ContentEntry = {
      kind,
      id: info.id,
      file: file.path,
      pack: info.pack,
      raw: undefined,
      parsed: undefined,
      value: undefined,
      errors: [],
    };
    try {
      entry.parsed = parseJson(file.text, file.path);
      const raw = entry.parsed.value;
      if (raw && typeof raw === 'object' && !Array.isArray(raw))
        delete (raw as Record<string, unknown>).$schema;
      entry.raw = raw;
      const r = validate(kind.schema, raw, {
        subject: `${kind.name} "${info.id}"`,
        where: { file: file.path },
        locate: entry.parsed.locate,
        fixHint: `Schema: npm run tool -- describe ${kind.name}`,
      });
      if (r.ok) entry.value = r.value;
      else entry.errors.push(...r.errors);
    } catch (err) {
      if (!(err instanceof EngineError)) throw err;
      entry.errors.push(err);
    }
    const map = this.items.get(kind.name)!;
    const prev = map.get(info.id);
    if (prev && prev.file !== entry.file) {
      if (this.packs.indexOf(prev.pack) > this.packs.indexOf(entry.pack)) {
        this.shadowed.push(entry);
        return entry;
      }
      this.shadowed.push(prev);
    }
    map.set(info.id, entry);
    return entry;
  }

  kind(name: string): ContentKind {
    const k = this.kinds.get(name);
    if (k) return k;
    throw new EngineError({
      code: 'CONTENT_KIND_UNKNOWN',
      what: `Unknown content kind "${name}"`,
      why: didYouMean(name, this.kinds.keys()),
      fix: 'Kinds are registered by plugins; list them with: npm run tool -- list kinds',
    });
  }

  kindList(): ContentKind[] {
    return [...this.kinds.values()];
  }

  has(kind: ContentKind | string, id: string): boolean {
    const e = this.entry(kind, id);
    return !!e && !e.errors.length;
  }

  entry(kind: ContentKind | string, id: string): ContentEntry | undefined {
    return this.items.get(typeof kind === 'string' ? kind : kind.name)?.get(id);
  }

  /** Ids of a kind, sorted. */
  ids(kind: ContentKind | string): string[] {
    return [...(this.items.get(typeof kind === 'string' ? kind : kind.name)?.keys() ?? [])].sort();
  }

  /** Validated value of a content item. Throws a teaching error if missing or invalid. */
  get<K extends ContentKind>(kind: K, id: string, where?: ErrorWhere): ContentValue<K> {
    const e = this.entry(kind, id);
    if (!e) {
      throw new EngineError({
        code: 'CONTENT_NOT_FOUND',
        what: `No ${kind.name} with id "${id}"`,
        ...(where ? { where } : {}),
        why: didYouMean(id, this.ids(kind)),
        fix: `Create ${contentFilePath(this.gamePack ?? 'engine', kind.folder, id)} (npm run new -- ${kind.name} ${id}${this.gamePack ? ` --game ${this.gamePack.slice(5)}` : ''}).`,
      });
    }
    if (e.errors.length) throw e.errors[0]!;
    return e.value as ContentValue<K>;
  }

  /** Every load/validation error, plus files in unknown folders. */
  errors(): EngineError[] {
    const out = [...this.stray];
    for (const map of this.items.values()) for (const e of map.values()) out.push(...e.errors);
    return out;
  }

  /** Engine entries hidden by a game entry with the same id (for tooling). */
  shadowedEntries(): readonly ContentEntry[] {
    return this.shadowed;
  }
}
