import { z } from 'zod';

const vec3In = z.union([z.number(), z.tuple([z.number(), z.number(), z.number()])], {
  error: 'Expected a number or an [x, y, z] array',
});
const vec2List = z.array(z.tuple([z.number(), z.number()]));

export const SHAPES = [
  'box',
  'sphere',
  'capsule',
  'cylinder',
  'cone',
  'torus',
  'plane',
  'wedge',
  'lathe',
  'extrude',
] as const;

/**
 * One primitive of a procedural model. Parts form a tree through `parent`; animation clips
 * address parts by `id`. `pivot` picks where the part's origin sits on its shape: rotate an
 * arm around its shoulder with `pivot: "top"`.
 */
export const PartSchema = z
  .object({
    id: z.string().default('').meta({ description: 'Name for parenting and animation tracks' }),
    parent: z.string().default('').meta({ description: 'Parent part id; empty = model root' }),
    shape: z.enum(SHAPES).default('box'),
    size: vec3In.default([1, 1, 1]).meta({
      description:
        'Full size [x, y, z]. sphere: x = diameter; capsule/cylinder/cone: x = diameter, y = height',
    }),
    pos: vec3In.default(0).meta({ description: 'Position of the pivot relative to the parent' }),
    rot: vec3In.default(0).meta({ description: 'Yaw degrees or [x, y, z] Euler degrees (YXZ)' }),
    scale: vec3In.default(1),
    pivot: z.enum(['bottom', 'center', 'top']).default('bottom').meta({ description: 'Origin on the shape' }),
    material: z.string().default('default').meta({ description: 'Material name from the active look' }),
    color: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      .optional()
      .meta({ description: 'Tint multiplied with the material color' }),
    segments: z.number().int().min(3).max(64).default(16).meta({ description: 'Roundness of curved shapes' }),
    profile: vec2List.default([]).meta({ description: 'lathe: [radius, y] points, bottom to top' }),
    points: vec2List.default([]).meta({ description: 'extrude: [x, y] outline; size.z = depth' }),
    thickness: z.number().positive().default(0.25).meta({ description: 'torus: tube diameter' }),
    uv: z.enum(['box', 'world']).default('box').meta({ description: 'world = textures tile per meter' }),
    hidden: z.boolean().default(false),
    shadow: z.boolean().default(true).meta({ description: 'Cast shadows' }),
  })
  .strict();

export type PartData = z.output<typeof PartSchema>;
