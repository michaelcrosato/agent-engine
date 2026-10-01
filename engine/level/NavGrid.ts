import { Vector3 } from 'three';
import type { BuiltGrid } from './buildGrid.ts';

/** Max floor height difference walkable between neighboring cells (stairs of 0.5 m). */
const STEP = 0.55;

/**
 * Walkability and A* paths over a room's grid map. Cells with a floor and no wall are
 * walkable; neighbors connect when their floor heights differ by at most one step.
 * Diagonals require both side cells to be walkable (no corner cutting).
 */
export class NavGrid {
  readonly grid: BuiltGrid;
  private readonly blocked = new Set<number>();

  constructor(grid: BuiltGrid) {
    this.grid = grid;
  }

  /** Marks a cell unwalkable (closed doors, hazards); `false` clears the mark. */
  block(col: number, row: number, on = true): void {
    const k = row * this.grid.cols + col;
    if (on) this.blocked.add(k);
    else this.blocked.delete(k);
  }

  walkable(col: number, row: number): boolean {
    const c = this.grid.cells[row]?.[col];
    return !!c && c.floor !== null && c.wallTop === 0 && !this.blocked.has(row * this.grid.cols + col);
  }

  /** Cell containing a world position. */
  cellAt(p: { x: number; z: number }): [number, number] {
    return [Math.floor(p.x / this.grid.cell), Math.floor(p.z / this.grid.cell)];
  }

  /** World position of a cell center at its floor height. */
  center(col: number, row: number): Vector3 {
    const s = this.grid.cell;
    return new Vector3((col + 0.5) * s, this.grid.cells[row]?.[col]?.floor ?? 0, (row + 0.5) * s);
  }

  private height(col: number, row: number): number {
    return this.grid.cells[row]![col]!.floor ?? 0;
  }

  /** Cell-center waypoints from `from` to `to` (both world positions), or undefined if unreachable. */
  path(from: { x: number; z: number }, to: { x: number; z: number }): Vector3[] | undefined {
    const { cols, rows } = this.grid;
    const [sc, sr] = this.cellAt(from);
    const [gc, gr] = this.cellAt(to);
    if (!this.walkable(gc, gr)) return undefined;
    const key = (c: number, r: number) => r * cols + c;
    const start = key(sc, sr);
    const goal = key(gc, gr);
    const g = new Map<number, number>([[start, 0]]);
    const came = new Map<number, number>();
    const open = new Map<number, number>([[start, Math.hypot(gc - sc, gr - sr)]]);
    while (open.size) {
      let cur = -1;
      let best = Infinity;
      for (const [k, f] of open) if (f < best) [cur, best] = [k, f];
      if (cur === goal) break;
      open.delete(cur);
      const c = cur % cols;
      const r = Math.floor(cur / cols);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dc && !dr) continue;
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || !this.walkable(nc, nr)) continue;
          if (dc && dr && (!this.walkable(c + dc, r) || !this.walkable(c, r + dr))) continue;
          if (Math.abs(this.height(nc, nr) - this.height(c, r)) > STEP) continue;
          const nk = key(nc, nr);
          const cost = g.get(cur)! + (dc && dr ? Math.SQRT2 : 1);
          if (cost >= (g.get(nk) ?? Infinity)) continue;
          g.set(nk, cost);
          came.set(nk, cur);
          open.set(nk, cost + Math.hypot(gc - nc, gr - nr));
        }
      }
    }
    if (!g.has(goal)) return undefined;
    const out: Vector3[] = [];
    for (let k: number | undefined = goal; k !== undefined && k !== start; k = came.get(k)) {
      out.push(this.center(k % cols, Math.floor(k / cols)));
    }
    return out.reverse();
  }
}
