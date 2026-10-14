import { Body, type ComponentInput, type Engine, Label, Model, Transform } from '#engine/api.ts';

export type PartInput = NonNullable<ComponentInput<typeof Model>['parts']>[number];
export type Point = [number, number, number];

/** Build a small coherent prop; primitive parts share an entity and optional simple collider. */
export function scenery(
  engine: Engine,
  name: string,
  pos: Point,
  parts: PartInput[],
  solid?: Point,
  yaw = 0,
): number {
  const w = engine.world;
  const e = w.spawn({ name, tags: ['scenery'] });
  w.add(e, Transform, { pos, rot: yaw });
  w.add(e, Model, { parts, filterGroup: 'environment' });
  if (solid) w.add(e, Body, { type: 'static', size: solid, layer: 'world' });
  return e;
}

export function block(
  engine: Engine,
  name: string,
  pos: Point,
  size: Point,
  material = 'stone',
  yaw = 0,
): number {
  return scenery(engine, name, pos, [{ shape: 'box', size, material, uv: 'world' }], size, yaw);
}

export function sign(
  engine: Engine,
  name: string,
  pos: Point,
  text: string,
  color = '#abfff0',
  size = 0.3,
): void {
  const e = engine.world.spawn({ name });
  engine.world.add(e, Transform, { pos });
  engine.world.add(e, Label, { text, color, size, offset: [0, 0, 0], opacity: 0, billboard: true });
}

export function buildScenery(engine: Engine, town: boolean, ground = 'ground'): void {
  block(engine, 'island-floor', [0, -1.4, 0], [54, 1.4, 54], town ? 'sand' : ground);
  for (const [x, z, sx, sz] of [
    [0, -27, 55, 1],
    [0, 27, 55, 1],
    [-27, 0, 1, 55],
    [27, 0, 1, 55],
  ]) {
    block(engine, `boundary-${x}-${z}`, [x!, 0, z!], [sx!, town ? 1.1 : 3, sz!], 'stone');
  }
  // Distant mesas and a fractured moon give each bounded combat space a broad horizon.
  for (let i = 0; i < 18; i++) {
    const a = (i * Math.PI * 2) / 18;
    const d = 57 + (i % 3) * 11;
    const height = 10 + ((i * 7) % 21);
    scenery(
      engine,
      `mesa-${i}`,
      [Math.sin(a) * d, -5, Math.cos(a) * d],
      [
        {
          shape: 'lathe',
          size: [12 + (i % 5), height, 14],
          segments: 6,
          material: 'distant',
          rot: i * 19,
          profile: [
            [0.6, 0],
            [0.5, 0.2],
            [0.53, 0.28],
            [0.32, 0.55],
            [0.36, 0.7],
            [0.22, 0.92],
            [0.08, 1],
          ],
        },
        { shape: 'sphere', size: [10, 7, 11], pos: [3, height * 0.25, 2], segments: 5, material: 'distant' },
      ],
    );
  }
  scenery(
    engine,
    'rift-moon',
    [30, 34, -85],
    [
      { shape: 'sphere', size: 14, material: 'moon', segments: 32, pivot: 'center' },
      {
        shape: 'torus',
        size: [22, 22, 1],
        thickness: 0.08,
        material: 'cyan',
        rot: [65, 0, 25],
        pivot: 'center',
        segments: 64,
      },
    ],
  );
}
