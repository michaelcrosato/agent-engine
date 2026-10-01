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

/** Every texture op, by name. Add new ops here (npm run new -- texture-op <name>). */
export const TEXTURE_OPS = {
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
  return (TEXTURE_OPS as unknown as Record<string, TextureOp>)[name];
}
