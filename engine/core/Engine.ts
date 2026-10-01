import type { AudioOut } from '../audio/AudioOut.ts';
import { AudioRecorder } from '../audio/AudioRecorder.ts';
import { type ContentFile, ContentStore } from '../content/ContentStore.ts';
import { InputMapKind } from '../input/InputMap.ts';
import type { InputSource } from '../input/InputSource.ts';
import { InputState } from '../input/InputState.ts';
import { ScriptedInput } from '../input/ScriptedInput.ts';
import type { BuiltGrid } from '../level/buildGrid.ts';
import { type LoadRoomOptions, loadRoom } from '../level/loadRoom.ts';
import { type Room, RoomKind } from '../level/Room.ts';
import type { Physics } from '../physics/Physics.ts';
import { PrefabKind } from '../prefab/Prefab.ts';
import { type SpawnOptions, spawnPrefab } from '../prefab/spawnPrefab.ts';
import { TuningKind } from '../prefab/Tuning.ts';
import type { Ctx } from './Ctx.ts';
import type { ComponentType } from './defineComponent.ts';
import { type GameDef, gamePacks } from './defineGame.ts';
import type { ServiceKey } from './defineService.ts';
import { type Phase, type SystemDef, TICK_PHASES } from './defineSystem.ts';
import { EngineError, type ErrorWhere, toEngineError } from './EngineError.ts';
import { EventBus } from './EventBus.ts';
import { Log, type LogEntry } from './Log.ts';
import { missingPhysics } from './missingPhysics.ts';
import { Rng } from './Rng.ts';
import { didYouMean } from './suggest.ts';
import { createTime, type Time } from './Time.ts';
import { Transform } from './Transform.ts';
import { validatePlugins } from './validatePlugins.ts';
import type { Entity } from './World.ts';
import { World } from './World.ts';

export type EngineMode = 'headless' | 'browser';

/** DOM handles for browser plugins (renderer canvas, HUD/debug overlay root). */
export type BrowserHost = { canvas: HTMLCanvasElement; overlay: HTMLElement; muted?: boolean };

export type EngineOptions = {
  game: GameDef;
  /** Content files of the game's data packs: from disk in Node, from the bundle in the browser. */
  files: readonly ContentFile[];
  mode?: EngineMode;
  seed?: number;
  /** Fixed tick length in seconds (default 1/60). */
  step?: number;
  input?: InputSource;
  audio?: AudioOut;
  /** 'throw' (tests, tools) rethrows system errors; 'disable' (browser) reports once and disables. */
  onSystemError?: 'throw' | 'disable';
  logSink?: (e: LogEntry) => void;
  /** Extra tuning presets on top of the game's and room's (e.g. from `?tuning=`). */
  tuning?: readonly string[];
  /** Browser only: where to render and put overlays. */
  host?: BrowserHost;
};

/** Content kinds every game has, regardless of plugins. */
const CORE_KINDS = [RoomKind, PrefabKind, TuningKind, InputMapKind];

/**
 * The running game: world, content, services, and the fixed-step tick pipeline.
 * Create with `await Engine.create(...)`, then `loadRoom(id)` and `tick()` (headless) or
 * `advance(realSeconds)` (browser main loop).
 */
export class Engine {
  readonly mode: EngineMode;
  readonly game: GameDef;
  /** DOM handles in the browser; undefined headless. */
  readonly host: BrowserHost | undefined;
  readonly world = new World();
  readonly events = new EventBus();
  readonly time: Time;
  readonly rng: Rng;
  readonly log: Log;
  readonly content: ContentStore;
  readonly input = new InputState();
  inputSource: InputSource;
  audio: AudioOut;
  physics: Physics = missingPhysics;
  /** Errors from systems disabled under `onSystemError: 'disable'`. */
  readonly systemErrors: EngineError[] = [];
  roomId = '';
  room: Room | undefined;
  /** The current room's built grid map, if it has one (cells, blocks, glyph placements). */
  grid: BuiltGrid | undefined;
  activeTuning: string[] = [];
  readonly extraTuning: string[];

  private readonly components = new Map<string, ComponentType>();
  private readonly phases: Record<Phase, SystemDef[]>;
  private readonly ctxs = new Map<SystemDef, Ctx>();
  private readonly disabled = new Set<SystemDef>();
  private readonly services = new Map<ServiceKey<unknown>, unknown>();
  private readonly onSystemError: 'throw' | 'disable';
  private pendingRoom: { id: string; opts: LoadRoomOptions } | undefined;
  private accumulator = 0;

  private constructor(opts: EngineOptions) {
    this.mode = opts.mode ?? 'headless';
    this.game = opts.game;
    this.host = opts.host;
    this.time = createTime(opts.step);
    this.rng = new Rng(opts.seed ?? 1);
    this.log = new Log(opts.logSink);
    this.onSystemError = opts.onSystemError ?? 'throw';
    this.extraTuning = [...(opts.tuning ?? [])];
    this.inputSource = opts.input ?? new ScriptedInput();
    this.audio = opts.audio ?? new AudioRecorder(() => this.time.tick);
    const plugins = this.game.plugins;
    validatePlugins(this.game);
    this.components.set(Transform.name, Transform);
    for (const p of plugins) for (const c of p.components) this.components.set(c.name, c);
    const kinds = [...CORE_KINDS, ...plugins.flatMap((p) => p.contentKinds)];
    this.content = new ContentStore(kinds, opts.files, gamePacks(this.game));
    this.phases = { input: [], update: [], physics: [], late: [], frame: [] };
    for (const p of plugins) for (const s of p.systems) this.phases[s.phase].push(s);
    for (const list of Object.values(this.phases)) list.sort((a, b) => a.order - b.order);
  }

  static async create(opts: EngineOptions): Promise<Engine> {
    const engine = new Engine(opts);
    for (const p of engine.game.plugins) await p.setup?.(engine);
    return engine;
  }

  /** Every registered component type, by name. */
  componentTypes(): ComponentType[] {
    return [...this.components.values()];
  }

  /** Component type by name (as used in prefab JSON). Throws a teaching error if unknown. */
  component(name: string, where?: ErrorWhere): ComponentType {
    const c = this.components.get(name);
    if (c) return c;
    throw new EngineError({
      code: 'COMPONENT_UNKNOWN',
      what: `Unknown component "${name}"`,
      ...(where ? { where } : {}),
      why: `No plugin in game "${this.game.name}" registers it. ${didYouMean(name, this.components.keys())}`,
      fix: `Fix the name, add the plugin that defines it to games/${this.game.name}/game.ts, or scaffold it: npm run new -- component ${name}`,
    });
  }

  /** Systems in run order for a phase (for tools and the debug overlay). */
  systemsIn(phase: Phase): readonly SystemDef[] {
    return this.phases[phase];
  }

  provide<T>(key: ServiceKey<T>, value: T): void {
    this.services.set(key as ServiceKey<unknown>, value);
  }

  service<T>(key: ServiceKey<T>): T {
    if (this.services.has(key as ServiceKey<unknown>))
      return this.services.get(key as ServiceKey<unknown>) as T;
    throw new EngineError({
      code: 'SERVICE_MISSING',
      what: `Service "${key.name}" is not provided`,
      why: `${key.doc} No plugin called engine.provide() for it${this.mode === 'headless' ? ' (some services are browser-only)' : ''}.`,
      fix: 'Add the plugin that provides it to the game, or use engine.tryService() for optional services.',
    });
  }

  tryService<T>(key: ServiceKey<T>): T | undefined {
    return this.services.get(key as ServiceKey<unknown>) as T | undefined;
  }

  spawn(prefab: string, opts?: SpawnOptions): Entity {
    return spawnPrefab(this, prefab, opts);
  }

  /** Clears the world (keeping entities tagged "persist") and builds a room. */
  loadRoom(id: string, opts: LoadRoomOptions = {}): void {
    loadRoom(this, id, opts);
  }

  /** Room change requested from inside a system; happens at the end of the current tick. */
  requestRoom(id: string, opts: LoadRoomOptions = {}): void {
    this.pendingRoom = { id, opts };
  }

  /** Runs exactly one fixed tick: input → update → physics → late, then destroys doomed entities. */
  tick(): void {
    const t = this.time;
    t.tick++;
    t.dt = t.step;
    t.elapsed += t.step;
    this.events.beginTick(t.tick);
    this.log.tick = t.tick;
    this.input.update(this.inputSource.sample());
    for (const phase of TICK_PHASES) this.runPhase(phase);
    this.world.flush();
    if (this.pendingRoom) {
      const p = this.pendingRoom;
      this.pendingRoom = undefined;
      this.loadRoom(p.id, p.opts);
    }
  }

  /** Browser main loop: runs as many fixed ticks as real time requires, then the frame phase. */
  advance(realDt: number): void {
    const dt = Math.min(Math.max(realDt, 0), 0.25);
    this.accumulator += dt * this.time.scale;
    let n = 0;
    while (this.accumulator >= this.time.step && n < 8) {
      this.tick();
      this.accumulator -= this.time.step;
      n++;
    }
    if (n === 8) this.accumulator = 0;
    this.time.alpha = this.time.scale > 0 ? this.accumulator / this.time.step : 1;
    this.time.frameDt = dt;
    this.time.dt = dt;
    this.runPhase('frame');
  }

  /** Runs only the frame phase (rendering a paused game, editor mode). */
  renderOnly(realDt: number): void {
    this.time.frameDt = realDt;
    this.time.dt = realDt;
    this.runPhase('frame');
  }

  private runPhase(phase: Phase): void {
    for (const s of this.phases[phase]) {
      if (this.disabled.has(s)) continue;
      try {
        s.run(this.ctxFor(s));
      } catch (err) {
        const e = toEngineError(err, {
          code: 'SYSTEM_FAILED',
          what: `System ${s.name} threw`,
          where: { system: s.name },
        });
        const located = e.at({ system: s.name });
        if (this.onSystemError === 'throw') throw located;
        this.disabled.add(s);
        this.systemErrors.push(located);
        this.log.error(`${located.message}\n  (system disabled; fix and reload)`);
      }
    }
  }

  private ctxFor(s: SystemDef): Ctx {
    let ctx = this.ctxs.get(s);
    if (ctx) return ctx;
    const engine = this;
    ctx = {
      world: this.world,
      time: this.time,
      events: this.events.view(),
      rng: this.rng,
      content: this.content,
      input: this.input,
      get physics() {
        return engine.physics;
      },
      get audio() {
        return engine.audio;
      },
      log: this.log,
      mode: this.mode,
      system: s.name,
      spawn: (prefab, opts) => spawnPrefab(this, prefab, opts),
      service: (key) => this.service(key),
      engine: this,
    };
    this.ctxs.set(s, ctx);
    return ctx;
  }
}
