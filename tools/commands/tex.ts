import { z } from 'zod';
import { renderTexture } from '../../engine/gen/texture/renderTexture.ts';
import { TextureKind } from '../../engine/gen/texture/TextureRecipe.ts';
import { listGames } from '../../engine/node/loadGame.ts';
import { writePng } from '../../engine/node/writePng.ts';
import { defineTool } from '../lib/defineTool.ts';
import { openGame } from '../lib/openGame.ts';
import { outPath } from '../lib/outPath.ts';

/** Albedo | normal | roughness side by side, plus a 2×2 tiling of the albedo to show seams. */
function sheet(maps: ReturnType<typeof renderTexture>): { w: number; h: number; px: Uint8ClampedArray } {
  const s = maps.size;
  const w = s * 5;
  const h = s * 2;
  const px = new Uint8ClampedArray(w * h * 4);
  const blit = (src: Uint8ClampedArray, ox: number, oy: number) => {
    for (let y = 0; y < s; y++) px.set(src.subarray(y * s * 4, (y + 1) * s * 4), ((oy + y) * w + ox) * 4);
  };
  blit(maps.albedo, 0, 0);
  blit(maps.normal ?? maps.albedo, s, 0);
  blit(maps.roughness, 0, s);
  blit(maps.emissive ?? new Uint8ClampedArray(s * s * 4).fill(255), s, s);
  for (const [dx, dy] of [
    [2, 0],
    [3, 0],
    [2, 1],
    [3, 1],
  ] as const)
    blit(maps.albedo, dx * s, dy * s);
  return { w, h, px };
}

export const texTool = defineTool({
  name: 'tex',
  summary: 'Render texture recipes to PNG: albedo, normal, roughness, emissive, and a 2×2 tiling check.',
  usage: 'npm run tex -- <texture id | all> [--game agent-engine]\n  e.g. npm run tex -- bricks',
  args: z.object({ id: z.string(), game: z.string().optional() }),
  positional: ['id'],
  async run(a) {
    const engine = await openGame(a.game ?? listGames()[0]!);
    const ids = a.id === 'all' ? engine.content.ids(TextureKind) : [a.id];
    const files: string[] = [];
    const lines: string[] = [];
    for (const id of ids) {
      const t0 = performance.now();
      const maps = renderTexture(engine.content.get(TextureKind, id));
      const ms = performance.now() - t0;
      const { w, h, px } = sheet(maps);
      const rel = `textures/${id.replace(/\//g, '_')}.png`;
      writePng(outPath(rel), w, h, px);
      files.push(`out/${rel}`);
      lines.push(
        `${id.padEnd(16)} ${maps.size}px ${ms.toFixed(0)} ms  normal:${maps.normal ? 'y' : 'n'} glow:${maps.emissive ? 'y' : 'n'}`,
      );
    }
    lines.push('sheet layout: [albedo | normal | albedo×2 tiled] over [roughness | emissive | ...]');
    return { ok: true, summary: lines.join('\n'), files };
  },
});
