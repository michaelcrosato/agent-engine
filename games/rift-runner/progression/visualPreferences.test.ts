import { expect, test } from 'vitest';
import { Model, SaveStore } from '#engine/api.ts';
import { playtest } from '#engine/testing.ts';
import { RunKey } from '../RunState.ts';
import { newProfile, ProfileSchema } from './Profile.ts';

test('existing version-one saves gain default cel shading without resetting progression', () => {
  const legacy = { ...newProfile(), level: 12, gold: 734, depth: 8 };
  const { visualFilter: _filter, ...oldData } = legacy;
  const data = new Map([['runner', JSON.stringify({ version: 1, data: oldData })]]);
  const store = new SaveStore('runner', 1, ProfileSchema, {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  });
  const restored = store.load(newProfile);
  expect(restored).toEqual(legacy);
  expect(restored.visualFilter).toEqual({ style: 'cel', scope: 'scene' });
  for (const style of ['none', 'cel', 'graphic', 'vivid'] as const) {
    for (const scope of ['scene', 'environment', 'subjects'] as const) {
      restored.visualFilter = { style, scope };
      expect(store.save(restored)).toBe(true);
      expect(store.load(newProfile)).toEqual(restored);
    }
  }
});

test('town and generated expeditions classify scenery separately from actors and interactive props', async () => {
  const t = await playtest('rift-runner', 'start');
  for (const name of ['island-floor', 'market-walk', 'forge-stall', 'tree-0'])
    expect(t.get(name, Model).filterGroup).toBe('environment');
  for (const name of [
    'player',
    'forge',
    'vendor',
    'guide',
    'gate',
    'forge-anvil',
    'forge-reactor',
    'rest-bench',
  ])
    expect(t.get(name, Model).filterGroup).toBe('subject');
  const s = t.engine.service(RunKey);
  s.profile.visualFilter = { style: 'graphic', scope: 'subjects' };
  s.profile.depth = 30000;
  t.engine.loadRoom('expedition');
  t.tick(2);
  const w = t.engine.world;
  for (const e of w.query(Model)) {
    const label = w.label(e);
    if (label.startsWith('field-')) expect(w.get(e, Model)!.filterGroup).toBe('subject');
  }
  expect(t.get('island-floor', Model).filterGroup).toBe('environment');
  expect(t.get('exit-gate', Model).filterGroup).toBe('subject');
  expect(s.profile.visualFilter).toEqual({ style: 'graphic', scope: 'subjects' });
});
