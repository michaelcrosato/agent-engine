import { h } from './h.ts';

export type Tool = 'select' | 'place' | 'paint';

/** What the palette shows; rebuilt by the editor whenever it changes. */
export type PaletteState = {
  tool: Tool;
  prefab: string;
  glyph: string;
  room: string;
  rooms: readonly string[];
  prefabs: readonly string[];
  legend: readonly { glyph: string; doc: string }[];
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  status: string;
};

export type PaletteActions = {
  tool(t: Tool): void;
  prefab(id: string): void;
  glyph(g: string): void;
  room(id: string): void;
  save(): void;
  undo(): void;
  redo(): void;
  play(): void;
};

const HELP = [
  'Click: select · drag arrows: move',
  'RMB + WASD/QE: fly · wheel: dolly · MMB: pan',
  'R / Shift+R: turn 15° · F: focus · T: top view',
  'Del: delete · Ctrl+D: duplicate',
  'Ctrl+Z / Ctrl+Y: undo / redo · Ctrl+S: save',
  'F2: play ⇄ edit · Esc: cancel tool',
];

/** Left-hand panel: room actions, tools, grid glyphs to paint, and prefabs to place. */
export class Palette {
  readonly el: HTMLDivElement;
  private readonly actions: PaletteActions;
  private filter = '';

  constructor(parent: HTMLElement, actions: PaletteActions) {
    this.actions = actions;
    this.el = h('div', { className: 'ed-panel ed-palette' });
    parent.append(this.el);
  }

  private button(
    text: string,
    onClick: () => void,
    opts: { on?: boolean; off?: boolean; title?: string } = {},
  ) {
    const b = h('button', { textContent: text, title: opts.title ?? '', disabled: !!opts.off });
    if (opts.on) b.classList.add('on');
    b.addEventListener('click', onClick);
    return b;
  }

  render(s: PaletteState): void {
    const a = this.actions;
    const rooms = h('select', { title: 'Room to edit' });
    for (const r of s.rooms) rooms.append(h('option', { value: r, textContent: r }));
    rooms.value = s.room;
    rooms.addEventListener('change', () => a.room(rooms.value));
    const bar = h('div', { className: 'bar' });
    bar.append(
      this.button(s.dirty ? 'Save*' : 'Saved', a.save, { off: !s.dirty, title: 'Ctrl+S' }),
      this.button('Undo', a.undo, { off: !s.canUndo, title: 'Ctrl+Z' }),
      this.button('Redo', a.redo, { off: !s.canRedo, title: 'Ctrl+Y' }),
      this.button('Play', a.play, { title: 'F2' }),
    );
    const tools = h('div', { className: 'bar' });
    tools.append(
      this.button('Select (V)', () => a.tool('select'), { on: s.tool === 'select' }),
      this.button('Paint (B)', () => a.tool('paint'), { on: s.tool === 'paint' }),
    );
    const glyphs = h('div', { className: 'glyphs' });
    for (const g of s.legend) {
      const b = this.button(g.glyph === ' ' ? '␠' : g.glyph, () => a.glyph(g.glyph), {
        on: s.tool === 'paint' && s.glyph === g.glyph,
        title: g.doc,
      });
      glyphs.append(b);
    }
    const search = h('input', { type: 'search', placeholder: 'filter prefabs…', value: this.filter });
    const list = h('div', { className: 'prefabs' });
    const fill = () => {
      list.replaceChildren(
        ...s.prefabs
          .filter((p) => p.includes(this.filter))
          .map((p) =>
            this.button(p, () => a.prefab(p), {
              on: s.tool === 'place' && s.prefab === p,
              title: 'Click, then click in the room',
            }),
          ),
      );
    };
    search.addEventListener('input', () => {
      this.filter = search.value.trim();
      fill();
    });
    fill();
    this.el.replaceChildren(
      h('h3', { textContent: 'Room' }),
      rooms,
      bar,
      h('p', { className: 'status', textContent: s.status }),
      h('h3', { textContent: 'Tools' }),
      tools,
      h('h4', { textContent: 'Grid glyphs (paint)' }),
      glyphs,
      h('h4', { textContent: 'Prefabs (place)' }),
      search,
      list,
      h('pre', { className: 'help', textContent: HELP.join('\n') }),
    );
  }
}
