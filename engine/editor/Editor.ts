import { Vector3 } from 'three';
import type { Engine } from '../core/Engine.ts';
import type { Entity } from '../core/World.ts';
import { defaultLegend } from '../level/Grid.ts';
import { RoomKind } from '../level/Room.ts';
import { yawQuat } from '../math/yaw.ts';
import { PrefabKind } from '../prefab/Prefab.ts';
import { type Renderer, RendererKey } from '../render/Renderer.ts';
import { EditorMarkers } from './EditorMarkers.ts';
import { EDITOR_CSS } from './editorStyles.ts';
import { FlyCamera } from './FlyCamera.ts';
import { h } from './h.ts';
import { handleEditorKey } from './handleEditorKey.ts';
import { Inspector, type Selection } from './Inspector.ts';
import { Palette, type Tool } from './Palette.ts';
import { RoomDoc } from './RoomDoc.ts';
import { saveContentFile } from './saveContentFile.ts';
import { ViewportTools } from './ViewportTools.ts';

/** What the page gives the editor. */
export type EditorHost = {
  canvas: HTMLCanvasElement;
  overlay: HTMLElement;
  errors: { show(message: string): void; clear(): void };
  /** Whether canvas clicks should capture the mouse (play) or not (edit). */
  setEditing(on: boolean): void;
};

/**
 * The in-browser level editor (`?edit=1`, or F2 on the dev server). Edits the room file as
 * JSON through RoomDoc, re-applies it to the content store (validated, with teaching errors),
 * rebuilds the room, and saves through the dev server. F2 switches between editing (paused,
 * free camera) and playing the room as edited.
 */
export class Editor {
  readonly engine: Engine;
  tool: Tool = 'select';
  prefab = '';
  glyph = '#';
  selection: Selection | undefined;
  mode: 'edit' | 'play' = 'edit';
  doc: RoomDoc;
  private status = '';
  private readonly docs = new Map<string, RoomDoc>();
  private readonly host: EditorHost;
  private readonly r: Renderer;
  private readonly ui: HTMLDivElement;
  private readonly badge: HTMLDivElement;
  private readonly palette: Palette;
  private readonly inspector: Inspector;
  readonly fly: FlyCamera;
  readonly tools: ViewportTools;
  private readonly markers: EditorMarkers;
  private readonly onKey = (e: KeyboardEvent) => handleEditorKey(this, e);

  static start(engine: Engine, host: EditorHost): Editor {
    const ed = new Editor(engine, host);
    ed.frameRoom();
    ed.enterEdit();
    return ed;
  }

  private constructor(engine: Engine, host: EditorHost) {
    this.engine = engine;
    this.host = host;
    this.r = engine.service(RendererKey);
    if (!document.getElementById('engine-editor-css')) {
      document.head.append(h('style', { id: 'engine-editor-css', textContent: EDITOR_CSS }));
    }
    this.ui = h('div', { className: 'ed-root' });
    this.badge = h('div', {
      className: 'ed-badge',
      textContent: 'Playing the edited room · F2: back to the editor',
      hidden: true,
    });
    host.overlay.append(this.ui, this.badge);
    this.doc = this.docFor(engine.roomId);
    this.palette = new Palette(this.ui, {
      tool: (t) => this.setTool(t),
      prefab: (id) => {
        this.prefab = id;
        this.setTool('place');
      },
      glyph: (g) => {
        this.glyph = g;
        this.setTool('paint');
      },
      room: (id) => this.openRoom(id),
      save: () => void this.save(),
      undo: () => this.undo(),
      redo: () => this.redo(),
      play: () => this.enterPlay(),
    });
    this.inspector = new Inspector(this.ui, engine, (fn) => this.change(fn));
    this.fly = new FlyCamera(host.canvas);
    this.markers = new EditorMarkers(this.r.scene);
    this.tools = new ViewportTools(this, host.canvas, this.r, this.markers);
    addEventListener('keydown', this.onKey);
  }

  private docFor(id: string): RoomDoc {
    let d = this.docs.get(id);
    if (!d) {
      const entry = this.engine.content.entry(RoomKind, id);
      d = new RoomDoc(id, entry?.file ?? `rooms/${id}.json`, entry?.raw ?? {});
      this.docs.set(id, d);
    }
    return d;
  }

  /** Runs one doc edit; if it changed anything, re-applies the room, then `after`. */
  change(fn: (doc: RoomDoc) => boolean, after?: (doc: RoomDoc) => void): void {
    if (fn(this.doc)) {
      this.apply();
      after?.(this.doc);
    }
    this.refresh();
  }

  /** Pushes the doc into the content store (validating it) and rebuilds the room. */
  private apply(): void {
    const entry = this.engine.content.upsert({ path: this.doc.path, text: this.doc.text() });
    this.host.errors.clear();
    if (!entry || entry.errors.length) {
      for (const e of entry?.errors ?? []) this.host.errors.show(e.message);
      this.status = 'The room has errors (red panel). Fix the field or undo.';
      return;
    }
    const index = this.selection?.index;
    try {
      this.engine.loadRoom(this.doc.id);
      this.status = this.doc.dirty ? 'Unsaved changes' : '';
    } catch (err) {
      this.host.errors.show(err instanceof Error ? err.message : String(err));
      this.status = 'The room failed to build (red panel).';
    }
    this.selection = undefined;
    if (index !== undefined) this.select(this.tools.entityAt(`entities[${index}]`));
  }

  select(e: Entity | undefined): void {
    const src = e === undefined ? undefined : this.engine.world.sourceOf(e);
    const m = /^entities\[(\d+)\]$/.exec(src ?? '');
    this.selection = e === undefined ? undefined : { entity: e, index: m ? Number(m[1]) : undefined };
    this.refresh();
  }

  setTool(t: Tool): void {
    this.tool = t === 'place' && !this.prefab ? 'select' : t;
    this.refresh();
  }

  private refresh(): void {
    if (this.mode !== 'edit') return;
    const c = this.engine.content;
    const legend = { ...defaultLegend(), ...(this.engine.room?.grid?.legend ?? {}) };
    this.palette.render({
      tool: this.tool,
      prefab: this.prefab,
      glyph: this.glyph,
      room: this.doc.id,
      rooms: c.ids(RoomKind).filter((id) => c.entry(RoomKind, id)?.pack === c.gamePack),
      prefabs: c.ids(PrefabKind),
      legend: Object.entries(legend).map(([glyph, t]) => ({ glyph, doc: t.doc || glyph })),
      dirty: this.doc.dirty,
      canUndo: this.doc.canUndo,
      canRedo: this.doc.canRedo,
      status: this.status,
    });
    this.inspector.show(this.doc, this.selection);
  }

  undo(): void {
    if (this.doc.undo()) this.apply();
    this.refresh();
  }

  redo(): void {
    if (this.doc.redo()) this.apply();
    this.refresh();
  }

  async save(): Promise<void> {
    const text = this.doc.text();
    const res = await saveContentFile(this.doc.path, text);
    if (res.ok && this.doc.text() === text) this.doc.markSaved();
    this.status = res.ok ? `Saved ${this.doc.path}` : `Save failed: ${res.error}`;
    this.refresh();
  }

  private openRoom(id: string): void {
    this.doc = this.docFor(id);
    this.selection = undefined;
    this.apply();
    this.frameRoom();
    this.refresh();
  }

  /** Points the camera at the whole room: from above the south side, or straight down (`top`). */
  frameRoom(top = false): void {
    const g = this.engine.grid;
    const w = g ? g.cols * g.cell : 24;
    const d = g ? g.rows * g.cell : 24;
    const size = Math.max(w, d);
    const center = new Vector3(w / 2, 0, d / 2);
    if (top) this.fly.lookFrom(new Vector3(w / 2, size * 1.1 + 4, d / 2 + 0.01), center);
    else this.fly.lookFrom(new Vector3(w / 2, size * 0.6 + 4, d + size * 0.3), center);
  }

  enterEdit(): void {
    this.mode = 'edit';
    this.host.setEditing(true);
    this.host.overlay.classList.add('ed-editing');
    document.exitPointerLock?.();
    this.engine.time.scale = 0;
    this.doc = this.docFor(this.engine.roomId);
    this.apply();
    this.ui.hidden = false;
    this.badge.hidden = true;
    this.markers.visible = true;
    this.tools.enabled = true;
    this.refresh();
  }

  /** Plays the room as edited, from its spawn or (`fromHere`) from below the editor camera. */
  enterPlay(fromHere = false): void {
    const at = this.fly.pos.clone();
    this.apply();
    this.selection = undefined;
    this.mode = 'play';
    this.host.setEditing(false);
    this.host.overlay.classList.remove('ed-editing');
    this.ui.hidden = true;
    this.badge.hidden = false;
    this.markers.visible = false;
    this.tools.enabled = false;
    this.tools.frame();
    this.r.cameraOverride = undefined;
    this.engine.inputSource.sample();
    this.engine.time.scale = 1;
    const p = this.engine.world.tagged('player')[0];
    const hit = fromHere ? this.engine.physics.raycast(at, { x: 0, y: -1, z: 0 }, 100) : null;
    if (p !== undefined && hit)
      this.engine.physics.teleport(p, hit.point.add(new Vector3(0, 0.05, 0)), yawQuat(this.fly.yaw));
  }

  /** A data file changed on disk (hot reload already applied it): keep docs and selection in step. */
  contentChanged(path: string, text: string): void {
    const doc = [...this.docs.values()].find((d) => d.path === path);
    let disk: unknown;
    try {
      disk = JSON.parse(text);
    } catch {
      return;
    }
    if (doc && JSON.stringify(disk) === JSON.stringify(doc.json)) doc.markSaved();
    else if (doc && !doc.dirty) {
      const fresh = new RoomDoc(doc.id, path, disk);
      this.docs.set(doc.id, fresh);
      if (this.doc === doc) this.doc = fresh;
      this.status = 'Reloaded from disk';
    } else if (doc) {
      this.status = 'File changed on disk; your unsaved edits are kept (Save overwrites it).';
      if (this.doc === doc && this.mode === 'edit') this.apply();
    }
    if (this.mode === 'edit') {
      const index = this.selection?.index;
      this.selection = undefined;
      if (index !== undefined) this.select(this.tools.entityAt(`entities[${index}]`));
      this.refresh();
    }
  }

  /** Call once per rendered frame (before the engine's frame phase). */
  frame(dt: number): void {
    if (this.mode !== 'edit') return;
    this.engine.time.scale = 0;
    if (this.engine.roomId !== this.doc.id) this.openRoom(this.engine.roomId);
    this.r.cameraOverride = this.fly.update(dt);
    this.markers.sync(this.engine.world);
    this.tools.frame();
  }

  dispose(): void {
    removeEventListener('keydown', this.onKey);
    this.tools.dispose();
    this.markers.dispose();
    this.fly.dispose();
    this.ui.remove();
    this.badge.remove();
    this.r.cameraOverride = undefined;
    this.engine.time.scale = 1;
    this.host.setEditing(false);
  }
}
