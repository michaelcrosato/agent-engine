import { z } from 'zod';
import { ComponentsJson } from '../prefab/Prefab.ts';

/** What one glyph of a grid map means. */
export const TileSchema = z
  .object({
    floor: z
      .number()
      .nullable()
      .default(0)
      .meta({ description: 'Floor top height in meters; null = no floor (pit/void)' }),
    wall: z
      .union([z.boolean(), z.number().positive()])
      .default(false)
      .meta({ description: 'true = full-height wall; a number = wall of that height (cover, ledges)' }),
    prefab: z.string().default('').meta({ description: 'Prefab placed at the cell center', ref: 'prefab' }),
    rot: z.number().default(0).meta({ description: 'Yaw of the placed prefab in degrees' }),
    with: ComponentsJson.default({}).meta({ description: 'Component overrides for the placed prefab' }),
    material: z.string().default('').meta({ description: 'Floor material override (look material name)' }),
    wallMaterial: z.string().default('').meta({ description: 'Wall material override (look material name)' }),
    doc: z.string().default(''),
  })
  .strict();

export type TileData = z.output<typeof TileSchema>;

export const GridSchema = z
  .object({
    cell: z.number().positive().default(2).meta({ description: 'Cell size in meters' }),
    wallHeight: z.number().positive().default(4),
    ceiling: z.boolean().default(false).meta({ description: 'Close the room with a ceiling at wallHeight' }),
    legend: z.record(z.string().length(1), TileSchema).default({}).meta({
      description: 'Glyph → tile. Extends the default legend (# wall, . floor, P spawn, 1-9 raised)',
    }),
    rows: z
      .array(z.string())
      .min(1)
      .meta({ description: 'Map rows, top row = -Z (north). Column → +X, row → +Z.' }),
  })
  .strict();

export type Grid = z.output<typeof GridSchema>;

/**
 * Built-in glyphs. Rooms extend or override these in `grid.legend`.
 * Digits 1-9 raise the floor by 0.5 m each (stairs: 1234…).
 */
export function defaultLegend(): Record<string, TileData> {
  const t = (p: Partial<TileData>): TileData => TileSchema.parse(p);
  const legend: Record<string, TileData> = {
    '#': t({ wall: true, doc: 'wall' }),
    '.': t({ doc: 'floor' }),
    ' ': t({ floor: null, doc: 'void (outside)' }),
    _: t({ floor: null, doc: 'pit (no floor)' }),
    P: t({ prefab: 'spawn', doc: 'player spawn' }),
    '=': t({ wall: 1, doc: 'low wall / cover (1 m)' }),
  };
  for (let d = 1; d <= 9; d++) legend[String(d)] = t({ floor: d * 0.5, doc: `floor raised ${d * 0.5} m` });
  return legend;
}
