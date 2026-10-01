import { Vector3 } from 'three';
import { WebAudioOut } from '../audio/WebAudioOut.ts';
import { gamePacks } from '../core/defineGame.ts';
import { Engine } from '../core/Engine.ts';
import { consoleSink } from '../core/Log.ts';
import { type Snapshot, snapshot } from '../harness/snapshot.ts';
import { DomInput } from '../input/DomInput.ts';
import { InputMapKind } from '../input/InputMap.ts';
import { ScriptedInput } from '../input/ScriptedInput.ts';
import { RendererKey } from '../render/Renderer.ts';
import { browserContentFiles } from './browserContentFiles.ts';
import { ErrorPanel } from './ErrorPanel.ts';
import { loadBrowserGame } from './gameModules.ts';
import { applyContentChange } from './hotReload.ts';
import type { UrlParams } from './urlParams.ts';

/** What tools and Playwright see as `window.__engine`. */
export type EngineHandle = {
  engine: Engine;
  /** True once the first room is loaded (shot mode: after `frames` frames). */
  ready: boolean;
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

/** Boots a game in the page: canvas, overlay, engine, first room, main loop, and hot reload. */
export async function bootGame(params: UrlParams, root: HTMLElement): Promise<EngineHandle> {
  const canvas = document.createElement('canvas');
  canvas.className = 'engine-canvas';
  const overlay = document.createElement('div');
  overlay.className = 'engine-overlay';
  root.append(canvas, overlay);
  const panel = new ErrorPanel(overlay);
  const game = await loadBrowserGame(params.game);
  const engine = await Engine.create({
    game,
    files: browserContentFiles(gamePacks(game)),
    mode: 'browser',
    host: { canvas, overlay, muted: params.shot },
    seed: params.seed,
    tuning: params.tuning,
    onSystemError: 'disable',
    logSink: consoleSink('info'),
    ...(params.shot ? { input: new ScriptedInput() } : {}),
  });
  for (const e of engine.content.errors()) panel.show(e.message);
  if (!params.shot) {
    const dom = new DomInput(canvas, () => engine.content.get(InputMapKind, game.input), engine.time.step);
    engine.inputSource = dom;
    canvas.addEventListener('click', () => {
      if (!params.edit) dom.lock();
      if (engine.audio instanceof WebAudioOut) engine.audio.resume();
    });
  }
  const handle: EngineHandle = {
    engine,
    ready: false,
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
  if (r && params.look) r.applyLook(params.look);
  if (r && params.view === 'top') r.cameraOverride = overheadCamera(engine);
  if (r && params.cam)
    r.cameraOverride = { pos: new Vector3(...params.cam), target: new Vector3(...(params.at ?? [0, 0, 0])) };
  const resize = () => r?.resize(root.clientWidth || innerWidth, root.clientHeight || innerHeight);
  addEventListener('resize', resize);
  resize();
  if (params.shot) {
    for (let i = 0; i < params.frames; i++) engine.tick();
    engine.renderOnly(engine.time.step);
  }
  let last = performance.now();
  let frames = 0;
  let reported = 0;
  const loop = (now: number) => {
    const dt = (now - last) / 1000;
    last = now;
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
