type Json = Record<string, unknown>;
type Vec3 = [number, number, number];

/** One entry of a room's `entities` list, as written in the file. */
export type PlacementJson = Json & {
  prefab: string;
  name?: string;
  pos?: number | Vec3;
  cell?: [number, number];
  rot?: number | Vec3;
  with?: Record<string, Json>;
};

/** Grid facts the doc needs to snap cell placements. */
export type GridInfo = { cell: number };

const round = (v: number, step = 0.01) => Math.round(v / step) * step;
const wrapYaw = (d: number) => {
  const r = (((d + 180) % 360) + 360) % 360;
  return r - 180;
};

/**
 * The editor's working copy of one room file: plain JSON as written (so saving keeps the
 * author's shape), with undo/redo. Every change goes through `edit()`; the editor re-applies
 * `text()` to the content store, which validates it and rebuilds the room.
 */
export class RoomDoc {
  readonly id: string;
  readonly path: string;
  private data: Json;
  private saved: string;
  private readonly undoStack: string[] = [];
  private readonly redoStack: string[] = [];

  constructor(id: string, path: string, raw: unknown) {
    this.id = id;
    this.path = path;
    this.data = structuredClone((raw ?? {}) as Json);
    this.saved = this.text();
  }

  /** The room JSON as it would be saved. */
  text(): string {
    return `${JSON.stringify(this.data, null, 2)}\n`;
  }

  get json(): Readonly<Json> {
    return this.data;
  }

  get dirty(): boolean {
    return this.text() !== this.saved;
  }

  markSaved(): void {
    this.saved = this.text();
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Applies a change with undo. Returns false (and records nothing) if nothing changed. */
  edit(fn: (room: Json) => void): boolean {
    const before = this.text();
    fn(this.data);
    if (this.text() === before) return false;
    this.undoStack.push(before);
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack.length = 0;
    return true;
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (prev === undefined) return false;
    this.redoStack.push(this.text());
    this.data = JSON.parse(prev) as Json;
    return true;
  }

  redo(): boolean {
    const next = this.redoStack.pop();
    if (next === undefined) return false;
    this.undoStack.push(this.text());
    this.data = JSON.parse(next) as Json;
    return true;
  }

  entities(): PlacementJson[] {
    return (this.data.entities as PlacementJson[] | undefined) ?? [];
  }

  placement(i: number): PlacementJson | undefined {
    return this.entities()[i];
  }

  private list(room: Json): PlacementJson[] {
    if (!Array.isArray(room.entities)) room.entities = [];
    return room.entities as PlacementJson[];
  }

  /** Moves a placement. Cell placements snap to the cell under `pos`; others store `pos`. */
  move(i: number, pos: Vec3, grid?: GridInfo): boolean {
    return this.edit((room) => {
      const p = this.list(room)[i];
      if (!p) return;
      if (p.cell && p.pos === undefined && grid) {
        p.cell = [Math.floor(pos[0] / grid.cell), Math.floor(pos[2] / grid.cell)];
      } else {
        delete p.cell;
        p.pos = [round(pos[0]), round(pos[1]), round(pos[2])];
      }
    });
  }

  /** Turns a placement around the vertical axis by `degrees`. */
  rotate(i: number, degrees: number): boolean {
    return this.edit((room) => {
      const p = this.list(room)[i];
      if (!p) return;
      if (Array.isArray(p.rot)) p.rot = [p.rot[0], wrapYaw(p.rot[1] + degrees), p.rot[2]];
      else p.rot = wrapYaw((p.rot ?? 0) + degrees);
    });
  }

  /** Sets a top-level placement key (name, prefab, tags, ...); undefined removes it. */
  set(i: number, key: string, value: unknown): boolean {
    return this.edit((room) => {
      const p = this.list(room)[i] as Json | undefined;
      if (!p) return;
      if (value === undefined && key !== 'prefab') delete p[key];
      else p[key] = value;
    });
  }

  /** Overrides one component field for this placement (`with`); undefined resets it to the prefab's. */
  override(i: number, component: string, field: string, value: unknown): boolean {
    return this.edit((room) => {
      const p = this.list(room)[i];
      if (!p) return;
      const w = (p.with ??= {});
      const c = (w[component] ??= {});
      if (value === undefined) delete c[field];
      else c[field] = value;
      if (!Object.keys(c).length) delete w[component];
      if (!Object.keys(w).length) delete p.with;
    });
  }

  /** Adds a component (with its defaults) to one placement through `with`. */
  addComponent(i: number, component: string): boolean {
    return this.edit((room) => {
      const p = this.list(room)[i];
      if (!p) return;
      const w = (p.with ??= {});
      w[component] ??= {};
    });
  }

  /** Appends a placement; returns its index. */
  add(p: PlacementJson): number {
    let index = -1;
    this.edit((room) => {
      const list = this.list(room);
      list.push(structuredClone(p));
      index = list.length - 1;
    });
    return index;
  }

  remove(i: number): boolean {
    return this.edit((room) => {
      this.list(room).splice(i, 1);
    });
  }

  /** Copies a placement next to the original (unique name, offset by `offset`); returns its index. */
  duplicate(i: number, offset: Vec3 = [1, 0, 0]): number {
    const src = this.placement(i);
    if (!src) return -1;
    const copy = structuredClone(src);
    if (copy.name) copy.name = this.uniqueName(copy.name);
    if (Array.isArray(copy.pos))
      copy.pos = [copy.pos[0] + offset[0], copy.pos[1] + offset[1], copy.pos[2] + offset[2]];
    else if (copy.cell)
      copy.cell = [copy.cell[0] + Math.sign(offset[0]), copy.cell[1] + Math.sign(offset[2])];
    return this.add(copy);
  }

  /** `base`, or `base-2`, `base-3`, ... whichever no placement uses yet. */
  uniqueName(base: string): string {
    const used = new Set(this.entities().map((p) => p.name));
    const stem = base.replace(/-\d+$/, '');
    if (!used.has(base)) return base;
    for (let n = 2; ; n++) if (!used.has(`${stem}-${n}`)) return `${stem}-${n}`;
  }

  /** Sets grid cells to a glyph as one undo step. Cells outside the map are ignored. */
  paint(cells: readonly (readonly [number, number])[], glyph: string): boolean {
    const rows = (this.data.grid as { rows?: string[] } | undefined)?.rows;
    if (!rows?.length || glyph.length !== 1) return false;
    const width = Math.max(...rows.map((r) => r.length));
    return this.edit((room) => {
      const r = (room.grid as { rows: string[] }).rows;
      for (const [col, row] of cells) {
        if (row < 0 || row >= r.length || col < 0 || col >= width) continue;
        const line = r[row]!.padEnd(col + 1, ' ');
        r[row] = line.slice(0, col) + glyph + line.slice(col + 1);
      }
    });
  }

  /** Glyph at a cell (' ' outside the map). */
  glyphAt(col: number, row: number): string {
    const rows = (this.data.grid as { rows?: string[] } | undefined)?.rows ?? [];
    return rows[row]?.[col] ?? ' ';
  }
}
