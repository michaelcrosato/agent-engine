import type { Mesh } from 'three';
import { expect, test } from 'vitest';
import { ContentStore } from '../content/ContentStore.ts';
import { Log } from '../core/Log.ts';
import { buildPuppet, disposePuppet, type PuppetInstance } from './buildPuppet.ts';
import { MaterialLibrary } from './MaterialLibrary.ts';
import { TextureCache } from './TextureCache.ts';

test('shared geometry survives live users and is released after the last procedural instance', () => {
  const materials = new MaterialLibrary(new TextureCache(new ContentStore([], [], [])), new Log());
  const parts = [{ shape: 'torus', size: [5.123, 5.123, 0.1] }];
  const meshOf = (inst: PuppetInstance) => inst.root.children[0]!.children[0] as Mesh;
  const a = buildPuppet(parts, { materials });
  const b = buildPuppet(parts, { materials });
  const geometry = meshOf(a).geometry;
  let released = 0;
  geometry.addEventListener('dispose', () => released++);
  expect(meshOf(b).geometry).toBe(geometry);
  disposePuppet(a);
  expect(released).toBe(0);
  disposePuppet(a); // Repeated cleanup cannot free another model's reference.
  expect(released).toBe(0);
  disposePuppet(b);
  expect(released).toBe(1);
  const c = buildPuppet(parts, { materials });
  expect(meshOf(c).geometry).not.toBe(geometry);
  disposePuppet(c);
  materials.setPalette({});
});
