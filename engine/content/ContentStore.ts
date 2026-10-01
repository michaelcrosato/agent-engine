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
  origin: 'engine' | 'game';
  /** JSON as written (minus `$schema`), for the editor and tools. */
  raw: unknown;
  parsed: ParsedJson | undefined;
  value: unknown;
  errors: EngineError[];
};

/**
 * All data files visible to one game: shared `engine/data/**` plus `games/<game>/data/**`.
 * Game files shadow engine files with the same kind and id. Files are parsed and validated
 * on load; errors are collected (see `errors()`) so one bad file never blocks the rest.
 */
export class ContentStore {
  private readonly kinds = new Map<string, ContentKind>();
  private readonly byFolder = new Map<string, ContentKind>();
  private readonly items = new Map<string, Map<string, ContentEntry>>();
  private readonly shadowed: ContentEntry[] = [];
  private readonly stray: EngineError[] = [];
  readonly game: string | undefined;

  constructor(kinds: readonly ContentKind[], files: readonly ContentFile[], game: string | undefined) {
    this.game = game;
    for (const k of kinds) {
      this.kinds.set(k.name, k);
      this.byFolder.set(k.folder, k);
      this.items.set(k.name, new Map());
    }
    const sorted = [...files].sort(
      (a, b) => Number(a.path.startsWith('games/')) - Number(b.path.startsWith('games/')),
    );
    for (const f of sorted) this.upsert(f);
  }

  /** Adds or replaces a file (hot reload). Returns the entry, or undefined if not content. */
  upsert(file: ContentFile): ContentEntry | undefined {
    const info = parseContentPath(file.path);
    if (!info) return undefined;
    if (info.origin === 'game' && info.game !== this.game) return undefined;
    const kind = this.byFolder.get(info.folder);
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
      origin: info.origin,
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
      if (prev.origin === 'game' && entry.origin === 'engine') {
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
        fix: `Create ${contentFilePath(this.game, kind.folder, id)} (npm run new -- ${kind.name} ${id}${this.game ? ` --game ${this.game}` : ''}).`,
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
