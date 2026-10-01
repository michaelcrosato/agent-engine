import { z } from 'zod';
import { defineContentKind } from '../content/defineContentKind.ts';
import { ComponentsJson } from '../prefab/Prefab.ts';
import { GridSchema } from './Grid.ts';

const vec3In = z.union([z.number(), z.tuple([z.number(), z.number(), z.number()])], {
  error: 'Expected a number or an [x, y, z] array',
});

/** One placed prefab instance in a room. */
export const PlacementSchema = z
  .object({
    prefab: z.string().meta({ description: 'Prefab id', ref: 'prefab' }),
    name: z.string().default('').meta({ description: 'Unique name for signals, tests, and the editor' }),
    pos: vec3In.optional().meta({ description: 'World position [x, y, z]; or use "cell"' }),
    cell: z
      .tuple([z.number(), z.number()])
      .optional()
      .meta({ description: 'Grid cell [col, row]; places at the cell center on its floor' }),
    rot: vec3In.default(0).meta({ description: 'Yaw degrees, or [x, y, z] Euler degrees' }),
    scale: vec3In.default(1),
    with: ComponentsJson.default({}).meta({
      description: 'Component overrides: { "Health": { "max": 200 } }',
    }),
    tags: z.array(z.string()).default([]),
  })
  .strict();

export type PlacementData = z.output<typeof PlacementSchema>;

export const RoomSchema = z
  .object({
    doc: z.string().default('').meta({ description: 'What this room demonstrates or is for' }),
    look: z
      .string()
      .default('default')
      .meta({ description: 'Look id (lighting, sky, materials, post)', ref: 'look' }),
    music: z.string().default('').meta({ description: 'Song id, or empty for silence', ref: 'music' }),
    tuning: z.array(z.string()).default([]).meta({ description: 'Extra tuning presets for this room' }),
    grid: GridSchema.optional().meta({ description: 'Text-map layout (walls, floors, glyph prefabs)' }),
    entities: z.array(PlacementSchema).default([]),
  })
  .strict();

export type Room = z.output<typeof RoomSchema>;

/** Levels: data/rooms/<id>.json. A room is a grid map and/or placed prefabs plus a look. */
export const RoomKind = defineContentKind({
  name: 'room',
  folder: 'rooms',
  doc: 'A playable space: grid text-map, placed prefabs, look, music, and tuning.',
  schema: RoomSchema,
});
