import type { z } from 'zod';

/** Small injectable storage contract: localStorage in browsers, memory in tests. */
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Validated, versioned saves. A damaged primary slot falls back to the last valid backup. */
export class SaveStore<T> {
  readonly key: string;
  readonly version: number;
  private readonly schema: z.ZodType<T>;
  private readonly storage: SaveStorage | undefined;
  status = 'Session only';

  constructor(key: string, version: number, schema: z.ZodType<T>, storage?: SaveStorage) {
    this.key = key;
    this.version = version;
    this.schema = schema;
    this.storage = storage;
  }

  private decode(raw: string | null): T | undefined {
    if (!raw) return undefined;
    try {
      const envelope = JSON.parse(raw) as { version?: number; data?: unknown };
      if (envelope.version !== this.version) return undefined;
      const result = this.schema.safeParse(envelope.data);
      return result.success ? result.data : undefined;
    } catch {
      return undefined;
    }
  }

  load(fallback: () => T): T {
    if (!this.storage) return fallback();
    try {
      const primary = this.storage.getItem(this.key);
      const decoded = this.decode(primary);
      if (decoded) {
        this.status = 'Progress restored';
        return decoded;
      }
      const backup = this.decode(this.storage.getItem(`${this.key}:backup`));
      if (backup) {
        this.status = 'Backup restored';
        return backup;
      }
      this.status = primary ? 'Save unreadable · new session' : 'Autosave ready';
    } catch {
      this.status = 'Storage unavailable · session only';
    }
    return fallback();
  }

  save(data: T): boolean {
    const parsed = this.schema.safeParse(data);
    if (!parsed.success) {
      this.status = 'Save rejected · invalid data';
      return false;
    }
    if (!this.storage) return false;
    try {
      const previous = this.storage.getItem(this.key);
      if (previous && this.decode(previous)) this.storage.setItem(`${this.key}:backup`, previous);
      this.storage.setItem(this.key, JSON.stringify({ version: this.version, data: parsed.data }));
      this.status = 'Progress saved';
      return true;
    } catch {
      this.status = 'Storage full or unavailable · session only';
      return false;
    }
  }
}
