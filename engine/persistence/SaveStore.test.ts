import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { type SaveStorage, SaveStore } from './SaveStore.ts';

function memory(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}
const schema = z.object({ gold: z.number().nonnegative() });

describe('SaveStore', () => {
  test('persists validated data and recovers a corrupt primary from its last valid backup', () => {
    const storage = memory(),
      store = new SaveStore('runner', 1, schema, storage);
    store.save({ gold: 10 });
    store.save({ gold: 25 });
    expect(store.load(() => ({ gold: 0 }))).toEqual({ gold: 25 });
    storage.data.set('runner', '{broken');
    expect(store.load(() => ({ gold: 0 }))).toEqual({ gold: 10 });
    expect(store.status).toBe('Backup restored');
  });
  test('wrong versions, invalid values and storage failures never crash gameplay', () => {
    const storage = memory(),
      store = new SaveStore('runner', 2, schema, storage);
    storage.data.set('runner', JSON.stringify({ version: 1, data: { gold: 999 } }));
    expect(store.load(() => ({ gold: 0 }))).toEqual({ gold: 0 });
    expect(store.save({ gold: -1 })).toBe(false);
    const unavailable = new SaveStore('runner', 1, schema, {
      getItem() {
        throw new DOMException('denied');
      },
      setItem() {
        throw new DOMException('quota');
      },
    });
    expect(unavailable.load(() => ({ gold: 7 }))).toEqual({ gold: 7 });
    expect(unavailable.save({ gold: 8 })).toBe(false);
  });
});
