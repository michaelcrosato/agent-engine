import { EngineError } from '../core/EngineError.ts';
import { didYouMean } from '../core/suggest.ts';
import { defaultLegend, type GridData, type TileData } from './Grid.ts';

/** A merged box of level geometry. `pos` is the bottom-center; `size` is full extents. */
export type BlockSpec = {
  kind: 'floor' | 'wall' | 'ceiling';
  pos: [number, number, number];
  size: [number, number, number];
  material: string;
};

export type GridCell = {
  col: number;
  row: number;
  glyph: string;
  tile: TileData;
  /** Floor top height, or null for void/pit. */
  floor: number | null;
  /** Wall top height above y = 0, or 0 when the cell has no wall. */
  wallTop: number;
};

export type GridPlacement = {
  prefab: string;
  name: string;
  pos: [number, number, number];
  rot: number;
  with: TileData['with'];
  path: string;
};

export type BuiltGrid = {
  cols: number;
  rows: number;
  cell: number;
  cells: GridCell[][];
  blocks: BlockSpec[];
  placements: GridPlacement[];
};

/** Floor slabs extend this far below y = 0 so the level has visible thickness. */
export const FLOOR_THICKNESS = 0.5;

/** Center of a cell in world space, at height y. Column → +X, row → +Z. */
export function cellCenter(cell: number, col: number, row: number, y = 0): [number, number, number] {
  return [(col + 0.5) * cell, y, (row + 0.5) * cell];
}

/** Greedy rectangle cover of all cells where `key(c)` is non-empty and equal. */
function mergeRects(cells: GridCell[][], key: (c: GridCell) => string) {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  const used = cells.map((r) => r.map(() => false));
  const out: { col: number; row: number; w: number; h: number; key: string }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = key(cells[r]![c]!);
      if (!k || used[r]![c]) continue;
      let w = 1;
      while (c + w < cols && !used[r]![c + w] && key(cells[r]![c + w]!) === k) w++;
      let h = 1;
      grow: while (r + h < rows) {
        for (let x = c; x < c + w; x++) if (used[r + h]![x] || key(cells[r + h]![x]!) !== k) break grow;
        h++;
      }
      for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) used[y]![x] = true;
      out.push({ col: c, row: r, w, h, key: k });
    }
  }
  return out;
}

/** Turns a grid text-map into merged level boxes and glyph prefab placements. */
export function buildGrid(grid: GridData, file?: string): BuiltGrid {
  const legend = { ...defaultLegend(), ...grid.legend };
  const cols = Math.max(...grid.rows.map((r) => r.length));
  const cells: GridCell[][] = grid.rows.map((line, row) =>
    Array.from({ length: cols }, (_, col) => {
      const glyph = line[col] ?? ' ';
      const tile = legend[glyph];
      if (!tile) {
        throw new EngineError({
          code: 'GRID_GLYPH_UNKNOWN',
          what: `Unknown map glyph "${glyph}" at column ${col}, row ${row}`,
          where: { ...(file ? { file } : {}), path: `$.grid.rows[${row}]` },
          why: `Legend has: ${Object.keys(legend)
            .map((g) => JSON.stringify(g))
            .join(' ')}. ${didYouMean(glyph, Object.keys(legend))}`,
          fix: `Add "${glyph}": { ... } to grid.legend, e.g. { "prefab": "crate" }.`,
        });
      }
      const wallTop =
        tile.wall === true ? grid.wallHeight : tile.wall === false ? 0 : (tile.floor ?? 0) + tile.wall;
      return { col, row, glyph, tile, floor: tile.floor, wallTop };
    }),
  );

  const blocks: BlockSpec[] = [];
  const s = grid.cell;
  const box = (
    kind: BlockSpec['kind'],
    r: { col: number; row: number; w: number; h: number },
    y0: number,
    y1: number,
    material: string,
  ) =>
    blocks.push({
      kind,
      pos: [(r.col + r.w / 2) * s, y0, (r.row + r.h / 2) * s],
      size: [r.w * s, y1 - y0, r.h * s],
      material,
    });

  for (const r of mergeRects(cells, (c) =>
    c.wallTop > 0 ? `${c.wallTop}|${c.tile.wallMaterial || 'wall'}` : '',
  )) {
    const [top, mat] = r.key.split('|') as [string, string];
    box('wall', r, -FLOOR_THICKNESS, Number(top), mat);
  }
  for (const r of mergeRects(cells, (c) =>
    c.wallTop === 0 && c.floor !== null ? `${c.floor}|${c.tile.material || 'floor'}` : '',
  )) {
    const [top, mat] = r.key.split('|') as [string, string];
    box('floor', r, -FLOOR_THICKNESS, Number(top), mat);
  }
  if (grid.ceiling) {
    for (const r of mergeRects(cells, (c) => (c.floor !== null || c.wallTop > 0 ? 'ceiling' : ''))) {
      box('ceiling', r, grid.wallHeight, grid.wallHeight + FLOOR_THICKNESS, 'ceiling');
    }
  }

  const placements: GridPlacement[] = [];
  for (const line of cells) {
    for (const c of line) {
      if (!c.tile.prefab) continue;
      placements.push({
        prefab: c.tile.prefab,
        name: `${c.tile.prefab}@${c.col},${c.row}`,
        pos: cellCenter(s, c.col, c.row, c.floor ?? 0),
        rot: c.tile.rot,
        with: c.tile.with,
        path: `$.grid.rows[${c.row}]`,
      });
    }
  }
  return { cols, rows: grid.rows.length, cell: s, cells, blocks, placements };
}
