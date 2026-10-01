import type { Engine } from '../core/Engine.ts';
import type { Entity } from '../core/World.ts';
import { RendererKey } from '../render/Renderer.ts';
import { viewRay } from '../render/viewRay.ts';
import { toJsonValue } from '../schema/toJsonValue.ts';
import { DEBUG_CSS } from './debugStyles.ts';
import { PhysicsDebugView } from './PhysicsDebugView.ts';

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/** One line per component, values in JSON form, cut to fit the panel. */
export function describeEntity(engine: Engine, e: Entity, width = 150): string[] {
  const w = engine.world;
  const src = w.sourceOf(e);
  const head = `${w.label(e)}${src ? `  (${src})` : ''}${w.tagsOf(e).length ? `  #${w.tagsOf(e).join(' #')}` : ''}`;
  const lines = [head];
  for (const type of w.componentsOf(e)) {
    const json = JSON.stringify(toJsonValue(w.get(e, type), 2)).replace(/"(\w+)":/g, '$1:');
    lines.push(`  ${type.name} ${json.length > width ? `${json.slice(0, width - 1)}…` : json}`);
  }
  return lines;
}

/**
 * In-game debug panel (browser only): frame and tick stats, per-system timings, the entity under
 * the crosshair with its components, and optional physics wireframes. Toggle with the input map's
 * "debug" key (default Backquote); Shift+key toggles physics shapes. `?debug=1` opens it at boot.
 */
export class DebugOverlay {
  private readonly engine: Engine;
  private readonly el: HTMLDivElement;
  private readonly keys: readonly string[];
  private physics: PhysicsDebugView | undefined;
  private visible = false;
  private since = 0;
  private frames = 0;
  private fps = 0;
  private readonly onKey = (e: KeyboardEvent) => {
    if (!this.keys.includes(e.code) || (e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.shiftKey) this.togglePhysics();
    else this.toggle();
  };

  constructor(engine: Engine, overlay: HTMLElement, keys: readonly string[]) {
    this.engine = engine;
    this.keys = keys;
    if (!document.getElementById('engine-debug-css')) {
      const style = document.createElement('style');
      style.id = 'engine-debug-css';
      style.textContent = DEBUG_CSS;
      document.head.append(style);
    }
    this.el = document.createElement('div');
    this.el.className = 'engine-debug';
    this.el.hidden = true;
    overlay.append(this.el);
    addEventListener('keydown', this.onKey);
  }

  toggle(on = !this.visible): void {
    this.visible = on;
    this.el.hidden = !on;
    this.engine.profile = on ? (this.engine.profile ?? new Map()) : undefined;
  }

  togglePhysics(on = !this.physics): void {
    const r = this.engine.tryService(RendererKey);
    if (!r) return;
    if (on && !this.physics) this.physics = new PhysicsDebugView(r.scene);
    if (!on && this.physics) {
      this.physics.dispose();
      this.physics = undefined;
    }
  }

  /** Call once per rendered frame. */
  frame(dt: number): void {
    this.physics?.update(this.engine.physics);
    this.frames++;
    this.since += dt;
    if (this.since < 0.25) return;
    this.fps = this.frames / this.since;
    this.frames = 0;
    this.since = 0;
    if (this.visible) this.el.innerHTML = this.render();
  }

  private target(): Entity | undefined {
    const w = this.engine.world;
    const r = this.engine.tryService(RendererKey);
    const player = w.tagged('player')[0];
    if (player === undefined || r?.cameraOverride) return undefined;
    const ray = viewRay(w, player);
    return this.engine.physics.raycast(ray.origin, ray.dir, 80, { exclude: player, sensors: true })?.entity;
  }

  private render(): string {
    const e = this.engine;
    const r = e.tryService(RendererKey);
    const info = r?.three.info;
    const rows = [
      `<b>${esc(e.game.name)}/${esc(e.roomId)}</b>  tick ${e.time.tick}  ${e.time.scale === 0 ? '<i>paused</i>' : ''}`,
      `fps ${this.fps.toFixed(0)}  entities ${e.world.entities().length}  bodies ${e.physics.rapierWorld.bodies.len()}`,
      `draw calls ${info?.render.calls ?? 0}  triangles ${((info?.render.triangles ?? 0) / 1000).toFixed(1)}k  look ${esc(r?.lookId ?? '')}  music ${esc(e.audio.currentMusic ?? 'none')}`,
      `<span class="dim">${esc(this.keys[0] ?? '')}: close  Shift+${esc(this.keys[0] ?? '')}: physics shapes ${this.physics ? 'on' : 'off'}</span>`,
      '',
      '<b>systems</b> (ms)',
    ];
    const prof = [...(e.profile ?? [])].sort((a, b) => b[1] - a[1]).slice(0, 8);
    for (const [name, ms] of prof) rows.push(`  ${ms.toFixed(2).padStart(6)}  ${esc(name)}`);
    const t = this.target();
    if (t !== undefined) rows.push('', '<b>under crosshair</b>', ...describeEntity(e, t).map(esc));
    const errors = e.systemErrors.length + e.content.errors().length;
    if (errors) rows.push('', `<span class="bad">${errors} error(s): see the error panel</span>`);
    return rows.join('\n');
  }

  dispose(): void {
    removeEventListener('keydown', this.onKey);
    this.togglePhysics(false);
    this.el.remove();
    this.engine.profile = undefined;
  }
}
