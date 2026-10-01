import type { TextureOp } from './defineTextureOp.ts';
import { bricks } from './ops/bricks.ts';
import { cells } from './ops/cells.ts';
import { checker } from './ops/checker.ts';
import { fill } from './ops/fill.ts';
import { gradient } from './ops/gradient.ts';
import { lines } from './ops/lines.ts';
import { noise } from './ops/noise.ts';
import { planks } from './ops/planks.ts';
import { rivets } from './ops/rivets.ts';
import { scratches } from './ops/scratches.ts';
import { spots } from './ops/spots.ts';
import { stripes } from './ops/stripes.ts';
import { tiles } from './ops/tiles.ts';

/** Every texture op, by name. To add one, write ops/<name>.ts with defineTextureOp and list it here. */
export const textureOps = {
  fill,
  noise,
  cells,
  bricks,
  tiles,
  planks,
  stripes,
  checker,
  lines,
  rivets,
  scratches,
  spots,
  gradient,
} as const;

export function textureOp(name: string): TextureOp | undefined {
  return (textureOps as unknown as Record<string, TextureOp>)[name];
}
