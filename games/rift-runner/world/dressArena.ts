import type { Engine } from '#engine/api.ts';
import { scenery } from './buildScenery.ts';

/** Repeated architectural motifs tie very different palettes and layouts to one place. */
export function dressArena(engine: Engine): void {
  scenery(
    engine,
    'arena-inlays',
    [0, 0.015, 0],
    [
      { size: [4.2, 0.015, 44], material: 'paving', uv: 'world' },
      { size: [43, 0.018, 2.8], material: 'paving', uv: 'world' },
      { shape: 'cylinder', size: [11, 0.025, 11], segments: 48, material: 'stone' },
      {
        shape: 'torus',
        size: [10.3, 10.3, 0.05],
        thickness: 0.045,
        pivot: 'center',
        pos: [0, 0.05, 0],
        material: 'brass',
        shadow: false,
      },
      {
        shape: 'torus',
        size: [8.7, 8.7, 0.05],
        thickness: 0.035,
        pivot: 'center',
        pos: [0, 0.05, 0],
        material: 'brass',
        shadow: false,
      },
    ],
  );
  for (const x of [-2.4, 2.4]) {
    const parts = Array.from({ length: 12 }, (_, i) => ({
      size: [0.07, 0.025, 0.7] as [number, number, number],
      pos: [0, 0, -20 + i * 3.6] as [number, number, number],
      material: 'cyan',
      shadow: false,
    }));
    scenery(engine, `route-${x}`, [x, 0.06, 0], parts);
  }
  for (const z of [-26.3, 26.3]) {
    scenery(
      engine,
      `wall-trim-${z}`,
      [0, 0, z],
      [
        { size: [52, 0.2, 0.28], pos: [0, 2.8, 0], material: 'brass' },
        { size: [52, 0.06, 0.3], pos: [0, 0.2, 0], material: 'cyan', shadow: false },
      ],
    );
  }
}
