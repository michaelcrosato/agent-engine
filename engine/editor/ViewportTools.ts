import { BoxGeometry, BoxHelper, Group, Mesh, MeshBasicMaterial, type Object3D, type Vector3 } from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { Engine } from '../core/Engine.ts';
import { Transform } from '../core/Transform.ts';
import type { Entity } from '../core/World.ts';
import { LabelsKey } from '../render/LabelSystem.ts';
import type { Renderer } from '../render/Renderer.ts';
import type { EditorMarkers } from './EditorMarkers.ts';
import type { Selection } from './Inspector.ts';
import type { Tool } from './Palette.ts';
import { type Pick, pickEntity } from './pickEntity.ts';
import type { RoomDoc } from './RoomDoc.ts';

/** The part of the editor the viewport tools drive. */
export type ToolHost = {
  readonly engine: Engine;
  readonly tool: Tool;
  readonly prefab: string;
  readonly glyph: string;
  readonly selection: Selection | undefined;
  select(e: Entity | undefined): void;
  change(fn: (doc: RoomDoc) => boolean, after?: (doc: RoomDoc) => void): void;
};

const snap = (v: number, step: number) => Math.round(v / step) * step;

/**
 * Mouse work in the 3D view: click to select, drag the gizmo to move (written back as `pos` or
 * `cell`), click to place the chosen prefab, and drag to paint grid cells with the chosen glyph.
 */
export class ViewportTools {
  enabled = true;
  private readonly host: ToolHost;
  private readonly canvas: HTMLCanvasElement;
  private readonly r: Renderer;
  private readonly markers: EditorMarkers;
  private readonly gizmo: TransformControls;
  private readonly proxy: Object3D = new Group();
  private readonly box = new BoxHelper(new Group(), 0xffcc33);
  private readonly stroke = new Map<string, [number, number]>();
  private readonly strokeView = new Group();
  private readonly off: (() => void)[] = [];

  constructor(host: ToolHost, canvas: HTMLCanvasElement, r: Renderer, markers: EditorMarkers) {
    this.host = host;
    this.canvas = canvas;
    this.r = r;
    this.markers = markers;
    this.gizmo = new TransformControls(r.camera, canvas);
    this.gizmo.setTranslationSnap(0.25);
    this.gizmo.getHelper().userData.editorIgnore = true;
    r.scene.add(this.proxy, this.gizmo.getHelper(), this.box, this.strokeView);
    this.gizmo.addEventListener('objectChange', () => this.preview());
    this.gizmo.addEventListener('dragging-changed', (e) => {
      if (!e.value) this.commitMove();
    });
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
      canvas.addEventListener(type, fn as EventListener);
      this.off.push(() => canvas.removeEventListener(type, fn as EventListener));
    };
    on('pointerdown', (e) => this.down(e));
    on('pointermove', (e) => this.move(e));
    on('pointerup', () => this.up());
  }

  private pick(e: PointerEvent): Pick | undefined {
    const roots: Object3D[] = [...this.r.models.values()].map((m) => m.inst.root);
    for (const b of this.host.engine.tryService(LabelsKey)?.values() ?? []) roots.push(b.mesh);
    roots.push(this.markers.root);
    return pickEntity(this.r.camera, roots, this.canvas, e.clientX, e.clientY);
  }

  private down(e: PointerEvent): void {
    if (!this.enabled || e.button !== 0 || this.gizmo.axis !== null) return;
    const hit = this.pick(e);
    const h = this.host;
    if (h.tool === 'select') h.select(hit?.entity);
    else if (h.tool === 'place' && hit && h.prefab) {
      const p = hit.point;
      const y = hit.normal.y > 0.5 ? snap(p.y, 0.05) : 0;
      h.change(
        (d) => d.add({ prefab: h.prefab, pos: [snap(p.x, 0.5), y, snap(p.z, 0.5)] }) >= 0,
        (d) => h.select(this.entityAt(`entities[${d.entities().length - 1}]`)),
      );
    } else if (h.tool === 'paint' && hit) {
      this.stroke.clear();
      this.paintAt(hit);
    }
  }

  private move(e: PointerEvent): void {
    if (!this.enabled || this.host.tool !== 'paint' || !(e.buttons & 1) || !this.stroke.size) return;
    const hit = this.pick(e);
    if (hit) this.paintAt(hit);
  }

  private up(): void {
    if (!this.stroke.size) return;
    const cells = [...this.stroke.values()];
    this.stroke.clear();
    this.strokeView.clear();
    this.host.change((d) => d.paint(cells, this.host.glyph));
  }

  private paintAt(hit: Pick): void {
    const g = this.host.engine.grid;
    if (!g) return;
    const p = hit.point.clone().addScaledVector(hit.normal, -0.05);
    const col = Math.floor(p.x / g.cell);
    const row = Math.floor(p.z / g.cell);
    if (col < 0 || row < 0 || col >= g.cols || row >= g.rows || this.stroke.has(`${col},${row}`)) return;
    this.stroke.set(`${col},${row}`, [col, row]);
    const m = new Mesh(
      new BoxGeometry(g.cell * 0.96, 0.08, g.cell * 0.96),
      new MeshBasicMaterial({ color: 0x4f8fd3, transparent: true, opacity: 0.55, depthTest: false }),
    );
    m.position.set((col + 0.5) * g.cell, Math.max(0, p.y) + 0.05, (row + 0.5) * g.cell);
    this.strokeView.add(m);
  }

  /** Entity spawned from a room-file source like "entities[3]". */
  entityAt(source: string): Entity | undefined {
    const w = this.host.engine.world;
    return w.entities().find((e) => w.sourceOf(e) === source);
  }

  private preview(): void {
    const sel = this.host.selection;
    const t = sel && this.host.engine.world.get(sel.entity, Transform);
    if (t) t.pos.copy(this.proxy.position);
  }

  private commitMove(): void {
    const sel = this.host.selection;
    if (sel?.index === undefined) return;
    const pos = this.proxy.position.toArray() as [number, number, number];
    const grid = this.host.engine.grid;
    this.host.change((d) => d.move(sel.index!, pos, grid ? { cell: grid.cell } : undefined));
  }

  /** The object that shows an entity: its model, label, or editor marker. */
  private visualOf(e: Entity): Object3D | undefined {
    return (
      this.r.models.get(e)?.inst.root ??
      this.host.engine.tryService(LabelsKey)?.get(e)?.mesh ??
      this.markers.root.children.find((c) => c.userData.entity === e)
    );
  }

  /** Keeps the gizmo and selection box on the selected entity. Call every frame. */
  frame(): void {
    const sel = this.enabled ? this.host.selection : undefined;
    const t = sel && this.host.engine.world.get(sel.entity, Transform);
    if (sel && t && sel.index !== undefined) {
      if (!this.gizmo.dragging) this.proxy.position.copy(t.pos);
      if (this.gizmo.object !== this.proxy) this.gizmo.attach(this.proxy);
    } else if (this.gizmo.object) this.gizmo.detach();
    const vis = sel && this.visualOf(sel.entity);
    this.box.visible = !!vis;
    if (vis) this.box.setFromObject(vis);
  }

  /** Current pointer target for "play from here" and focus. */
  focusPoint(): Vector3 | undefined {
    const sel = this.host.selection;
    return sel ? this.host.engine.world.get(sel.entity, Transform)?.pos.clone() : undefined;
  }

  dispose(): void {
    for (const f of this.off) f();
    this.gizmo.detach();
    this.gizmo.dispose();
    this.r.scene.remove(this.proxy, this.gizmo.getHelper(), this.box, this.strokeView);
  }
}
