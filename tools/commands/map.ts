import { z } from 'zod';
import { Transform } from '../../engine/core/Transform.ts';
import { buildGrid } from '../../engine/level/buildGrid.ts';
import { defaultLegend } from '../../engine/level/Grid.ts';
import { RoomKind } from '../../engine/level/Room.ts';
import { toJsonValue } from '../../engine/schema/toJsonValue.ts';
import { defineTool } from '../lib/defineTool.ts';
import { openGame, splitTarget } from '../lib/openGame.ts';

export const mapTool = defineTool({
  name: 'map',
  summary: 'Print a room as an ASCII map with rulers, glyph meanings, and every entity with its cell.',
  usage: 'npm run tool -- map <game>/<room>\n  e.g. npm run tool -- map agent-engine/hub',
  args: z.object({ target: z.string().meta({ description: 'game/room' }) }),
  positional: ['target'],
  async run(a) {
    const { game, rest: room } = splitTarget(a.target);
    const engine = await openGame(game);
    const data = engine.content.get(RoomKind, room);
    engine.loadRoom(room);
    const out = [`room ${game}/${room} — ${data.doc}`, `look: ${data.look}  music: ${data.music || '-'}`];
    if (data.grid) {
      const g = buildGrid(data.grid);
      out.push(
        `grid: ${g.cols}×${g.rows} cells of ${g.cell} m (x = (col + 0.5) × ${g.cell}, z = (row + 0.5) × ${g.cell}); top row is -Z`,
      );
      const tens = Array.from({ length: g.cols }, (_, c) =>
        c % 10 === 0 ? String(Math.floor(c / 10)) : ' ',
      ).join('');
      const ones = Array.from({ length: g.cols }, (_, c) => String(c % 10)).join('');
      out.push(`     ${tens}`, `     ${ones}`);
      for (const [i, r] of data.grid.rows.entries()) out.push(`${String(i).padStart(3)}  ${r}`);
      const legend = { ...defaultLegend(), ...data.grid.legend };
      const used = new Set(data.grid.rows.join(''));
      out.push('glyphs:');
      for (const [glyph, t] of Object.entries(legend)) {
        if (!used.has(glyph)) continue;
        const what = t.prefab
          ? `prefab ${t.prefab}`
          : t.wall
            ? `wall${t.wall === true ? '' : ` ${t.wall} m`}`
            : t.floor === null
              ? 'no floor'
              : `floor ${t.floor} m`;
        out.push(`  "${glyph}" ${what}${t.doc ? ` — ${t.doc}` : ''}`);
      }
    }
    out.push('entities (excluding level geometry):');
    const w = engine.world;
    const cell = data.grid?.cell ?? 0;
    for (const e of w.entities()) {
      if (w.hasTag(e, 'level')) continue;
      const t = w.get(e, Transform);
      const pos = t ? JSON.stringify(toJsonValue(t.pos, 2)) : '-';
      const c = t && cell ? ` cell [${Math.floor(t.pos.x / cell)},${Math.floor(t.pos.z / cell)}]` : '';
      out.push(`  ${(w.nameOf(e) ?? '').padEnd(18)} ${(w.prefabOf(e) ?? '').padEnd(16)} ${pos}${c}`);
    }
    return { ok: true, summary: out.join('\n') };
  },
});
