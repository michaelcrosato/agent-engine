import { type Engine, Light, Motion, Rng } from '#engine/api.ts';
import { block, type PartInput, scenery } from './buildScenery.ts';

/** Hand-composed landmarks, with deterministic smaller props and plant clusters. */
export function dressTown(engine: Engine): void {
  for (const x of [-5.7, 5.7]) {
    block(engine, `canal-${x}`, [x, -0.02, 2], [0.7, 0.1, 37], 'water');
    for (let z = -15; z < 21; z += 2) {
      scenery(
        engine,
        `curb-${x}-${z}`,
        [x + (x > 0 ? 0.55 : -0.55), 0, z],
        [{ size: [0.28, 0.18, 1.8], material: 'cream' }],
      );
    }
  }
  scenery(
    engine,
    'forge-anvil',
    [10.2, 1.35, -1.45],
    [
      {
        shape: 'extrude',
        size: [1.2, 0.48, 0.45],
        material: 'steel',
        points: [
          [-0.6, 0.7],
          [-0.25, 0.7],
          [-0.2, 0],
          [0.2, 0],
          [0.22, 0.7],
          [0.6, 0.88],
          [0.6, 1],
          [-0.6, 1],
        ],
      },
    ],
  );
  const fire = scenery(
    engine,
    'forge-reactor',
    [15.6, 0.4, -4.5],
    [
      { shape: 'cylinder', size: [1.6, 1.4, 1.6], material: 'dark', segments: 12 },
      { shape: 'sphere', size: [1.3, 0.7, 1.3], pos: [0, 1, 0], material: 'amber' },
      { shape: 'cylinder', size: [0.7, 3.2, 0.7], pos: [0, 1.4, 0], material: 'brass' },
    ],
  );
  engine.world.add(fire, Light, {
    color: '#ffb76a',
    intensity: 18,
    range: 7,
    offset: [0, 1.4, 0],
    flicker: 0.25,
  });
  for (const z of [-5, 9]) {
    scenery(engine, `cable-${z}`, [0, 5.8, z], [{ size: [27, 0.025, 0.025], material: 'dark' }]);
    for (let i = 0; i < 11; i++) {
      const flag = scenery(
        engine,
        `pennant-${z}-${i}`,
        [-11.5 + i * 2.3, 5.35, z],
        [
          {
            shape: 'extrude',
            size: [0.7, 0.9, 0.02],
            material: i % 3 === 0 ? 'rust' : i % 3 === 1 ? 'cream' : 'teal',
            points: [
              [-0.5, 1],
              [0.5, 1],
              [0, 0],
            ],
            pivot: 'top',
          },
        ],
      );
      engine.world.add(flag, Motion, { bob: 0.04, bobRate: 0.55 });
    }
  }
  const rng = new Rng(174);
  for (let i = 0; i < 22; i++) {
    const x = (i % 2 ? 1 : -1) * rng.range(18.5, 24),
      z = rng.range(-22, 22);
    const parts: PartInput[] = [];
    for (let j = 0; j < 5; j++)
      parts.push({
        shape: 'cone',
        size: [0.09, rng.range(0.3, 0.65), 0.08],
        pos: [rng.spread(0.3), 0, rng.spread(0.3)],
        material: j % 2 ? 'teal' : 'leaves',
        segments: 4,
        rot: [rng.spread(20), rng.range(0, 180), rng.spread(20)],
      });
    parts.push({
      shape: 'sphere',
      size: [0.5, 0.24, 0.4],
      material: 'stone',
      segments: 6,
      pos: [0.2, 0, 0.2],
    });
    scenery(engine, `foliage-${i}`, [x, 0.05, z], parts);
  }
  scenery(
    engine,
    'rest-bench',
    [12, 0.15, 10],
    [
      { size: [3.5, 0.15, 0.85], pos: [0, 0.5, 0], material: 'wood' },
      { size: [3.5, 0.55, 0.1], pos: [0, 0.65, 0.38], material: 'wood' },
      { size: [0.2, 0.5, 0.7], pos: [-1.25, 0, 0], material: 'dark' },
      { size: [0.2, 0.5, 0.7], pos: [1.25, 0, 0], material: 'dark' },
    ],
  );
}
