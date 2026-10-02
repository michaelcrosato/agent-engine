import { Vector3 } from 'three';
import type { ComponentData, ComponentType } from '../core/defineComponent.ts';
import type { EventType } from '../core/defineEvent.ts';
import type { Engine } from '../core/Engine.ts';
import { EngineError } from '../core/EngineError.ts';
import { Transform } from '../core/Transform.ts';
import type { Entity } from '../core/World.ts';
import type { ScriptedInput } from '../input/ScriptedInput.ts';
import { NavGrid } from '../level/NavGrid.ts';
import { Signal } from '../logic/Signal.ts';
import { wrap180, yawOf } from '../math/yaw.ts';
import { CameraRig } from '../render/CameraRig.ts';
import { type Snapshot, type SnapshotOpts, snapshot } from './snapshot.ts';

type Recorded = { tick: number; type: string; payload: unknown };

/** Input action names the bot helpers use (match your input map). */
export type BotActions = { forward: string; jump: string };

/**
 * Drives a game headlessly through real input actions and inspects the result.
 *
 *   const t = await playtest('agent-engine', 'range');
 *   t.lookAt('target-1'); t.press('fire'); t.wait(0.2);
 *   expect(t.get('target-1', Target).hit).toBe(true);
 */
export class Playtest {
  readonly engine: Engine;
  readonly input: ScriptedInput;
  readonly actions: BotActions;
  private readonly recorded: Recorded[] = [];

  constructor(engine: Engine, input: ScriptedInput, actions: Partial<BotActions> = {}) {
    this.engine = engine;
    this.input = input;
    this.actions = { forward: 'moveForward', jump: 'jump', ...actions };
    engine.events.onAny((payload, type) =>
      this.recorded.push({ tick: engine.time.tick, type: type.name, payload }),
    );
  }

  /** Simulated seconds so far. */
  get seconds(): number {
    return this.engine.time.elapsed;
  }

  tick(n = 1): this {
    for (let i = 0; i < n; i++) this.engine.tick();
    return this;
  }

  wait(seconds: number): this {
    return this.tick(Math.max(1, Math.round(seconds / this.engine.time.step)));
  }

  /** Ticks until `pred()` is true or `timeout` seconds pass. Returns whether it became true. */
  until(pred: () => boolean, timeout = 10): boolean {
    const end = this.seconds + timeout;
    while (this.seconds < end) {
      if (pred()) return true;
      this.tick();
    }
    return pred();
  }

  /** Holds an action; with `seconds`, holds that long then releases. */
  hold(action: string, seconds?: number): this {
    this.input.hold(action);
    if (seconds !== undefined) {
      this.wait(seconds);
      this.input.release(action);
    }
    return this;
  }

  release(action: string): this {
    this.input.release(action);
    return this;
  }

  /** Presses an action for exactly one tick. */
  press(action: string): this {
    this.input.tap(action);
    return this.tick();
  }

  /** Feeds a look delta in degrees (x = turn right, y = look up) for one tick. */
  look(dx: number, dy: number): this {
    this.input.look(dx, dy);
    return this.tick();
  }

  /** Entity by name; throws a teaching error listing similar names. */
  entity(name: string | Entity): Entity {
    return typeof name === 'number' ? name : this.engine.world.needNamed(name);
  }

  exists(name: string): boolean {
    return this.engine.world.named(name) !== undefined;
  }

  get<C extends ComponentType>(name: string | Entity, type: C): ComponentData<C> {
    return this.engine.world.need(this.entity(name), type, 'playtest.get');
  }

  pos(name: string | Entity): Vector3 {
    return this.get(name, Transform).pos.clone();
  }

  get player(): Entity {
    const p = this.engine.world.tagged('player')[0];
    if (p !== undefined) return p;
    throw new EngineError({
      code: 'PLAYTEST_NO_PLAYER',
      what: 'No entity tagged "player" exists',
      fix: 'Set playerPrefab in defineGame and tag that prefab "player", or address entities by name.',
    });
  }

  /** Payloads of an event type recorded since the playtest began (oldest first). */
  events<T>(type: EventType<T> | string): T[] {
    const name = typeof type === 'string' ? type : type.name;
    return this.recorded.filter((r) => r.type === name).map((r) => r.payload as T);
  }

  /** How many times each event type fired since the playtest began. */
  eventCounts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const r of this.recorded) out[r.type] = (out[r.type] ?? 0) + 1;
    return out;
  }

  /** Sets one component field by names (god mode, scenario setup): set('player', 'Health', 'invulnerable', true). */
  set(name: string | Entity, component: string, fieldName: string, value: unknown): this {
    const data = this.engine.world.need(
      this.entity(name),
      this.engine.component(component),
      'playtest.set',
    ) as Record<string, unknown>;
    if (!(fieldName in data)) {
      throw new EngineError({
        code: 'PLAYTEST_FIELD_UNKNOWN',
        what: `${component} has no field "${fieldName}"`,
        fix: `See its fields: npm run tool -- describe ${component}`,
      });
    }
    data[fieldName] = value;
    return this;
  }

  /** Sends a signal to an entity name or "#tag" (like a trigger would), then ticks once. */
  signal(target: string, action: string, value = 0): this {
    const w = this.engine.world;
    const targets = target.startsWith('#') ? w.tagged(target.slice(1)) : [this.entity(target)];
    for (const t of targets) this.engine.events.emit(Signal, { target: t, action, from: undefined, value });
    return this.tick();
  }

  /** Sound ids played since start (optionally only `id`). */
  sounds(id?: string): string[] {
    return this.engine.audio.history.map((h) => h.sound).filter((s) => !id || s === id);
  }

  /** Turns the player to face a target (entity name/id or point) through look input. */
  lookAt(target: string | Entity | Vector3, height = 1): this {
    const p = this.player;
    const w = this.engine.world;
    const t = w.need(p, Transform, 'playtest.lookAt');
    const rig = w.get(p, CameraRig);
    const eye = t.pos.clone().add(rig?.offset ?? new Vector3(0, 1.6, 0));
    const goal = target instanceof Vector3 ? target.clone() : this.pos(target).add(new Vector3(0, height, 0));
    const d = goal.sub(eye);
    const yaw = (Math.atan2(-d.x, -d.z) * 180) / Math.PI;
    const pitch = (Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180) / Math.PI;
    return this.look(-wrap180(yaw - yawOf(t.rot)), pitch - (rig?.pitch ?? 0));
  }

  /**
   * Walks the player to a target by following a grid path (or a straight line), steering with
   * look input and holding the forward action. Jumps when stuck. Returns whether it arrived;
   * walking into a room exit counts as arriving (the walk stops when the room changes).
   */
  walkTo(target: string | Entity | Vector3, opts: { timeout?: number; radius?: number } = {}): boolean {
    const radius = opts.radius ?? 0.7;
    const goal = target instanceof Vector3 ? target.clone() : this.pos(target);
    const w = this.engine.world;
    const t = () => w.need(this.player, Transform, 'playtest.walkTo');
    const grid = this.engine.grid;
    const route = (grid && new NavGrid(grid).path(t().pos, goal)) || [];
    route.push(goal);
    const end = this.seconds + (opts.timeout ?? 20);
    let lastPos = t().pos.clone();
    let stuckSince = this.seconds;
    const room = this.engine.roomId;
    const loads = this.events('RoomLoaded').length;
    for (const wp of route) {
      while (Math.hypot(wp.x - t().pos.x, wp.z - t().pos.z) > (wp === goal ? radius : radius * 1.2)) {
        if (this.engine.roomId !== room || this.events('RoomLoaded').length > loads) {
          this.input.release(this.actions.forward);
          return true;
        }
        if (this.seconds > end) {
          this.input.release(this.actions.forward);
          return false;
        }
        const d = wp.clone().sub(t().pos);
        const yaw = (Math.atan2(-d.x, -d.z) * 180) / Math.PI;
        this.input.look(-wrap180(yaw - yawOf(t().rot)), 0);
        this.input.hold(this.actions.forward);
        if (t().pos.distanceTo(lastPos) > 0.3) {
          lastPos = t().pos.clone();
          stuckSince = this.seconds;
        } else if (this.seconds - stuckSince > 0.6) {
          this.input.tap(this.actions.jump);
          stuckSince = this.seconds;
        }
        this.tick();
      }
    }
    this.input.release(this.actions.forward);
    return true;
  }

  snapshot(opts?: SnapshotOpts): Snapshot {
    return snapshot(this.engine, opts);
  }
}
