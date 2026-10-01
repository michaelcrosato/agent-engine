import { Vector3 } from 'three';
import { WebAudioOut } from '../audio/WebAudioOut.ts';
import { gamePacks } from '../core/defineGame.ts';
import { Engine } from '../core/Engine.ts';
import { consoleSink } from '../core/Log.ts';
import { DebugOverlay } from '../debug/DebugOverlay.ts';
import { Playtest } from '../harness/Playtest.ts';
import { runSteps, StepsSchema } from '../harness/runSteps.ts';
import { type Snapshot, snapshot } from '../harness/snapshot.ts';
import { DomInput } from '../input/DomInput.ts';
import { InputMapKind } from '../input/InputMap.ts';
import { MultiInput } from '../input/MultiInput.ts';
import { ScriptedInput } from '../input/ScriptedInput.ts';
import { TouchInput } from '../input/TouchInput.ts';
import { RendererKey } from '../render/Renderer.ts';
import { applyContentChange } from './applyContentChange.ts';
import { browserContentFiles } from './browserContentFiles.ts';
import { ErrorPanel } from './ErrorPanel.ts';
import { loadBrowserGame } from './loadBrowserGame.ts';
import type { UrlParams } from './readUrlParams.ts';

/** What tools and Playwright see as `window.__engine`. */
export type EngineHandle = {
  engine: Engine;
  /** True once the first room is loaded (shot mode: after `frames` frames). */
  ready: boolean;
  /** True while the level editor is in edit mode (clicks select instead of capturing the mouse). */
  editing: boolean;
  /** Called every rendered frame with the real frame time, before the engine advances. */
  frameHooks: ((dt: number) => void)[];
  /** The level editor once started (`?edit=1` or F2 on the dev server). */
  editor?: object;
  errors(): string[];
  snapshot(): Snapshot;
};

declare global {
  interface Window {
    __engine?: EngineHandle;
  }
}

function overheadCamera(engine: Engine): { pos: Vector3; target: Vector3 } {
  const g = engine.grid;
  const w = g ? g.cols * g.cell : 40;
  const d = g ? g.rows * g.cell : 40;
  const target = new Vector3(g ? w / 2 : 0, 0, g ? d / 2 : 0);
  const h = (Math.max(w, d * 1.6) / 2 / Math.tan((37.5 * Math.PI) / 180)) * 1.05;
  return { pos: target.clone().add(new Vector3(0, h, 0.01)), target };
}

/** Starts the level editor now (`?edit=1`) or on F2 when running on the dev server. */
async function setUpEditor(
  handle: EngineHandle,
  params: UrlParams,
  page: { canvas: HTMLCanvasElement; overlay: HTMLElement; panel: ErrorPanel },
): Promise<void> {
  const start = async () => {
    if (handle.editor) return;
    const { Editor } = await import('../editor/Editor.ts');
    const editor = Editor.start(handle.engine, {
      canvas: page.canvas,
      overlay: page.overlay,
      errors: page.panel,
      setEditing: (on) => {
        handle.editing = on;
      },
    });
    handle.editor = editor;
    handle.frameHooks.push((dt) => editor.frame(dt));
    import.meta.hot?.on('engine:content', (d: { path: string; text: string }) =>
      editor.contentChanged(d.path, d.text),
    );
  };
  if (params.edit) await start();
  else if (import.meta.hot) {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'F2' || handle.editor) return;
      removeEventListener('keydown', onKey);
      void start();
    };
    addEventListener('keydown', onKey);
  }
}

/** Boots a game in the page: canvas, overlay, engine, first room, main loop, and hot reload. */
export async function bootGame(params: UrlParams, root: HTMLElement): Promise<EngineHandle> {
  const canvas = document.createElement('canvas');
  canvas.className = 'engine-canvas';
  const overlay = document.createElement('div');
  overlay.className = 'engine-overlay';
  root.append(canvas, overlay);
  const panel = new ErrorPanel(overlay);
  const game = await loadBrowserGame(params.game);
  const scripted = params.shot ? new ScriptedInput() : undefined;
  const engine = await Engine.create({
    game,
    files: browserContentFiles(gamePacks(game)),
    mode: 'browser',
    host: { canvas, overlay, muted: params.shot },
    seed: params.seed,
    tuning: params.tuning,
    onSystemError: 'disable',
    logSink: consoleSink('info'),
    ...(scripted ? { input: scripted } : {}),
  });
  for (const e of engine.content.errors()) panel.show(e.message);
  const touchScreen = params.touch || matchMedia('(pointer: coarse)').matches;
  if (!params.shot) {
    const dom = new DomInput(canvas, () => engine.content.get(InputMapKind, game.input), engine.time.step);
    const touch = touchScreen ? new TouchInput(overlay) : undefined;
    engine.inputSource = touch ? new MultiInput([touch, dom]) : dom;
    canvas.addEventListener('click', () => {
      if (!handle.editing && !touch) dom.lock();
    });
    // Browsers start audio muted until a user gesture; touch counts only on pointerup/touchend.
    const unlock = () => engine.audio instanceof WebAudioOut && engine.audio.resume();
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) addEventListener(type, unlock);
  }
  const handle: EngineHandle = {
    engine,
    ready: false,
    editing: false,
    frameHooks: [],
    errors: () => [...engine.content.errors(), ...engine.systemErrors].map((e) => e.message),
    snapshot: () => snapshot(engine),
  };
  window.__engine = handle;
  try {
    engine.loadRoom(params.room || game.startRoom, params.spawn ? { spawn: params.spawn } : {});
  } catch (err) {
    panel.show(err instanceof Error ? err.message : String(err));
  }
  const r = engine.tryService(RendererKey);
  if (r && touchScreen) r.maxPixelRatio = 1.5;
  if (r && params.look) r.applyLook(params.look);
  if (r && params.view === 'top') r.cameraOverride = overheadCamera(engine);
  if (r && params.cam)
    r.cameraOverride = { pos: new Vector3(...params.cam), target: new Vector3(...(params.at ?? [0, 0, 0])) };
  const resize = () => r?.resize(root.clientWidth || innerWidth, root.clientHeight || innerHeight);
  addEventListener('resize', resize);
  resize();
  if (scripted) {
    try {
      if (params.steps) runSteps(new Playtest(engine, scripted), StepsSchema.parse(JSON.parse(params.steps)));
    } catch (err) {
      panel.show(err instanceof Error ? err.message : String(err));
    }
    for (let i = 0; i < params.frames; i++) engine.tick();
    engine.renderOnly(engine.time.step);
  }
  const debugKeys = engine.content.get(InputMapKind, game.input).actions.debug ?? ['Backquote'];
  const debug = new DebugOverlay(engine, overlay, debugKeys);
  if (params.debug) debug.toggle(true);
  handle.frameHooks.push((dt) => debug.frame(dt));
  if (!params.shot) await setUpEditor(handle, params, { canvas, overlay, panel });
  let last = performance.now();
  let frames = 0;
  let reported = 0;
  const loop = (now: number) => {
    const dt = (now - last) / 1000;
    last = now;
    for (const hook of handle.frameHooks) hook(dt);
    if (params.shot) engine.renderOnly(engine.time.step);
    else engine.advance(dt);
    for (; reported < engine.systemErrors.length; reported++)
      panel.show(engine.systemErrors[reported]!.message);
    frames++;
    if (!handle.ready && (!params.shot || frames >= 2)) handle.ready = true;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  import.meta.hot?.on('engine:content', (d: { path: string; text: string }) =>
    applyContentChange(engine, panel, d.path, d.text),
  );
  return handle;
}
