import { Mesh, MeshStandardMaterial, MeshToonMaterial } from 'three';
import { expect, test } from 'vitest';
import { ContentStore } from '../content/ContentStore.ts';
import { Log } from '../core/Log.ts';
import { buildPuppet, disposePuppet } from './buildPuppet.ts';
import { MaterialSchema } from './Look.ts';
import { MaterialLibrary } from './MaterialLibrary.ts';
import { TextureCache } from './TextureCache.ts';

test('one palette can shade subjects and scenery independently, including runtime group changes', () => {
  const materials = new MaterialLibrary(new TextureCache(new ContentStore([], [], [])), new Log());
  const definition = MaterialSchema.parse({ color: '#42b3a5', emissive: '#194d42', emissiveIntensity: 0.8 });
  materials.setPalette({ shared: definition });
  materials.setVisualFilter({ style: 'cel', scope: 'subjects' });
  const subject = materials.get('shared', '#ffccaa', 'subject');
  const environment = materials.get('shared', '#ffccaa', 'environment');
  expect(subject).toBeInstanceOf(MeshToonMaterial);
  expect(environment).toBeInstanceOf(MeshStandardMaterial);
  expect((subject as MeshToonMaterial).color).toEqual((environment as MeshStandardMaterial).color);
  expect((subject as MeshToonMaterial).emissiveIntensity).toBe(0.8);
  expect(definition.color).toBe('#42b3a5');
  const puppet = buildPuppet([{ material: 'shared' }], { materials, filterGroup: 'environment' });
  const mesh = puppet.root.children[0]!.children[0] as Mesh;
  expect(mesh).toBeInstanceOf(Mesh);
  expect(mesh.userData.filterGroup).toBe('environment');
  expect(mesh.material).toBeInstanceOf(MeshStandardMaterial);
  disposePuppet(puppet);
  materials.setVisualFilter({ style: 'cel', scope: 'environment' });
  expect(materials.get('shared', undefined, 'environment')).toBeInstanceOf(MeshToonMaterial);
  expect(materials.get('shared', undefined, 'subject')).toBeInstanceOf(MeshStandardMaterial);
  materials.setPalette({});
});

test('switching filters releases shared ramps and materials, preserves glass, and restores authored lighting', () => {
  const materials = new MaterialLibrary(new TextureCache(new ContentStore([], [], [])), new Log());
  materials.setPalette({ solid: MaterialSchema.parse({}), glass: MaterialSchema.parse({ type: 'glass' }) });
  materials.setVisualFilter({ style: 'graphic', scope: 'scene' });
  const subject = materials.get('solid') as MeshToonMaterial;
  expect(materials.get('solid', undefined, 'environment')).toBe(subject);
  const ramp = subject.gradientMap!;
  let rampsDisposed = 0,
    materialsDisposed = 0;
  ramp.addEventListener('dispose', () => rampsDisposed++);
  subject.addEventListener('dispose', () => materialsDisposed++);
  expect(materials.get('glass')).toBeInstanceOf(MeshStandardMaterial);
  expect(materials.get('glass').transparent).toBe(true);
  materials.setVisualFilter({ style: 'none', scope: 'scene' });
  expect(rampsDisposed).toBe(1);
  expect(materialsDisposed).toBe(1);
  expect(materials.get('solid')).toBeInstanceOf(MeshStandardMaterial);
  materials.setVisualFilter({ style: 'cel', scope: 'scene' });
  expect((materials.get('solid') as MeshToonMaterial).gradientMap).not.toBe(ramp);
  materials.setPalette({});
});
