import type { Engine } from '../core/Engine.ts';
import { Transform } from '../core/Transform.ts';
import type { Entity } from '../core/World.ts';
import { PrefabKind } from '../prefab/Prefab.ts';
import { objectShape } from '../schema/schemaWalk.ts';
import { toJsonValue } from '../schema/toJsonValue.ts';
import { fieldInput, fieldMeta } from './fieldInput.ts';
import { h } from './h.ts';
import type { RoomDoc } from './RoomDoc.ts';

/** What the editor has selected: an entity, and its index in the room's `entities` if it has one. */
export type Selection = { entity: Entity; index: number | undefined };

/** Applies one change to the room doc; returns whether anything changed. */
export type DocChange = (fn: (doc: RoomDoc) => boolean) => void;

function row(
  label: string,
  input: HTMLElement,
  title = '',
  overridden = false,
  reset?: () => void,
): HTMLElement {
  const r = h('div', { className: `row${overridden ? ' over' : ''}`, title });
  r.append(h('label', { textContent: label }), input);
  if (reset) {
    const b = h('button', { className: 'reset', textContent: '↺', title: 'Reset to the prefab value' });
    b.addEventListener('click', reset);
    r.append(b);
  }
  return r;
}

/** Why an entity cannot be edited as a placement, from its recorded source. */
function notEditable(engine: Engine, e: Entity): string {
  const w = engine.world;
  const src = w.sourceOf(e);
  if (w.hasTag(e, 'player'))
    return "The player is spawned from the game's playerPrefab at a SpawnPoint; move the spawn instead.";
  if (src === 'grid') return 'Level geometry built from grid.rows. Use the Paint tool (B) to change cells.';
  if (src?.startsWith('grid['))
    return `Placed by a grid glyph at ${src.slice(4)}. Paint the cell or change grid.legend.`;
  return 'Spawned at runtime (not part of the room file).';
}

/**
 * Right-hand panel: the selected placement's fields (name, prefab, position, rotation, tags) and
 * every component's fields, generated from the component schemas. Edits become `with`
 * overrides in the room file; overridden fields are highlighted and can be reset.
 */
export class Inspector {
  readonly el: HTMLDivElement;
  private readonly engine: Engine;
  private readonly change: DocChange;
  private pending: [RoomDoc, Selection | undefined] | undefined;

  constructor(parent: HTMLElement, engine: Engine, change: DocChange) {
    this.engine = engine;
    this.change = change;
    this.el = h('div', { className: 'ed-panel ed-inspector' });
    parent.append(this.el);
  }

  private refIds = (kind: string): readonly string[] =>
    this.engine.content.kindList().some((k) => k.name === kind) ? this.engine.content.ids(kind) : [];

  /** Shows a selection. Rendering waits for the current event to finish, so an input that loses
   * focus while the panel is rebuilt can still commit its change safely. */
  show(doc: RoomDoc, sel: Selection | undefined): void {
    const first = !this.pending;
    this.pending = [doc, sel];
    if (first)
      queueMicrotask(() => {
        const [d, s] = this.pending!;
        this.pending = undefined;
        this.render(d, s);
      });
  }

  private render(doc: RoomDoc, sel: Selection | undefined): void {
    this.el.replaceChildren();
    if (!sel) {
      this.el.append(
        h('h3', { textContent: 'Inspector' }),
        h('p', {
          className: 'dim',
          textContent: 'Click an object to select it. Diamonds mark invisible entities.',
        }),
      );
      return;
    }
    const w = this.engine.world;
    this.el.append(h('h3', { textContent: w.label(sel.entity) }));
    if (sel.index === undefined) {
      this.el.append(h('p', { className: 'dim', textContent: notEditable(this.engine, sel.entity) }));
      return;
    }
    const i = sel.index;
    const p = doc.placement(i);
    if (!p) return;
    this.el.append(h('p', { className: 'dim', textContent: `${doc.path}  entities[${i}]` }));
    const text = (v: string, set: (s: string) => void, list = '') => {
      const inp = h('input', { type: 'text', value: v });
      if (list) inp.setAttribute('list', list);
      inp.addEventListener('change', () => set(inp.value.trim()));
      return inp;
    };
    this.ensureList('ed-prefabs', this.engine.content.ids(PrefabKind));
    this.el.append(
      row(
        'name',
        text(p.name ?? '', (v) => this.change((d) => d.set(i, 'name', v || undefined))),
      ),
      row(
        'prefab',
        text(p.prefab, (v) => this.change((d) => d.set(i, 'prefab', v)), 'ed-prefabs'),
      ),
    );
    if (p.cell && p.pos === undefined) {
      const cell = p.cell;
      const box = h('span', { className: 'vec' });
      for (const k of [0, 1]) {
        const inp = h('input', { type: 'number', step: '1', value: String(cell[k]) });
        inp.addEventListener('change', () => {
          const c = [...cell];
          c[k] = Math.round(Number(inp.value));
          this.change((d) => d.set(i, 'cell', c));
        });
        box.append(inp);
      }
      this.el.append(row('cell', box, 'Grid cell [col, row]; the floor height comes from the grid'));
    } else {
      const pos = Array.isArray(p.pos) ? p.pos : [p.pos ?? 0, p.pos ?? 0, p.pos ?? 0];
      const box = fieldInput(
        objectShape(Transform.schema)!.pos!,
        pos,
        (v) => this.change((d) => d.set(i, 'pos', v)),
        this.refIds,
      );
      this.el.append(row('pos', box));
    }
    const rot = fieldInput(
      objectShape(Transform.schema)!.rot!,
      p.rot ?? 0,
      (v) => this.change((d) => d.set(i, 'rot', v)),
      this.refIds,
    );
    this.el.append(row('rot', rot, 'Yaw degrees, or [x, y, z] Euler degrees (R / Shift+R turn 15°)'));
    const tags = ((p.tags as string[] | undefined) ?? []).join(', ');
    this.el.append(
      row(
        'tags',
        text(tags, (v) => {
          const list = v
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
          this.change((d) => d.set(i, 'tags', list.length ? list : undefined));
        }),
      ),
    );
    for (const type of w.componentsOf(sel.entity)) {
      if (type === Transform) continue;
      const shape = objectShape(type.schema) ?? {};
      const over = (p.with?.[type.name] ?? {}) as Record<string, unknown>;
      const live = toJsonValue(w.get(sel.entity, type), 3) as Record<string, unknown>;
      const box = h('details', { open: Object.keys(over).length > 0 });
      box.append(h('summary', { textContent: type.name, title: type.doc }));
      for (const [name, fs] of Object.entries(shape)) {
        const meta = fieldMeta(fs);
        if (meta.description?.startsWith('State')) continue;
        const has = name in over;
        const value = has ? over[name] : live[name];
        const input = fieldInput(
          fs,
          value,
          (v) => this.change((d) => d.override(i, type.name, name, v)),
          this.refIds,
        );
        const label = meta.unit ? `${name} (${meta.unit})` : name;
        const reset = has ? () => this.change((d) => d.override(i, type.name, name, undefined)) : undefined;
        box.append(row(label, input, meta.description ?? '', has, reset));
      }
      this.el.append(box);
    }
    const add = h('select');
    add.append(h('option', { value: '', textContent: '+ add component…' }));
    const present = new Set(w.componentsOf(sel.entity).map((t) => t.name));
    for (const t of this.engine.componentTypes()) {
      if (!present.has(t.name)) add.append(h('option', { value: t.name, textContent: t.name, title: t.doc }));
    }
    add.addEventListener('change', () => add.value && this.change((d) => d.addComponent(i, add.value)));
    this.el.append(add);
  }

  private ensureList(id: string, values: readonly string[]): void {
    let list = document.getElementById(id);
    if (!list) document.body.append((list = h('datalist', { id })));
    list.replaceChildren(...values.map((v) => h('option', { value: v })));
  }
}
