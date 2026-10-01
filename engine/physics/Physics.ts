import RAPIER from '@dimforge/rapier3d-simd-compat';
import { type Quaternion, Vector3 } from 'three';
import type { Vec3Like } from '../audio/AudioOut.ts';
import { EngineError } from '../core/EngineError.ts';
import { Transform } from '../core/Transform.ts';
import type { Entity, World } from '../core/World.ts';
import { Body } from './Body.ts';
import { CharacterBody } from './CharacterBody.ts';
import { createBodyHandle, createCharacterHandle, type PhysicsHandle } from './createHandle.ts';
import { type Layer, queryGroups } from './layers.ts';

export type RayHit = { entity: Entity; point: Vector3; normal: Vector3; distance: number };

export type QueryOpts = {
  /** Entities to ignore (usually the shooter). */
  exclude?: Entity | readonly Entity[];
  /** Only hit these layers (default: all). */
  layers?: readonly Layer[];
  /** Also hit sensors/triggers (default false). */
  sensors?: boolean;
};

export type MoveResult = { grounded: boolean; moved: Vector3; hitWall: boolean };

/** Raw collision callback used by PhysicsSystem to turn Rapier events into engine events. */
export type CollisionSink = (a: Entity, b: Entity, started: boolean, sensor: 'a' | 'b' | 'none') => void;

let initialized: Promise<void> | undefined;

/**
 * The physics world (Rapier) as systems see it: `ctx.physics`. Bodies are created from Body /
 * CharacterBody components automatically; queries return entities, never Rapier objects.
 */
export class Physics {
  /** The Rapier world (for advanced use; prefer the methods below). */
  rapierWorld: RAPIER.World;
  /** The ECS world whose Body/CharacterBody components this mirrors (injected at creation). */
  readonly ecs: World;
  private readonly handles = new Map<Entity, PhysicsHandle>();
  private readonly byCollider = new Map<number, Entity>();
  private readonly queue = new RAPIER.EventQueue(true);

  readonly gravity: number;

  private constructor(ecs: World, gravity: number) {
    this.ecs = ecs;
    this.gravity = gravity;
    this.rapierWorld = new RAPIER.World({ x: 0, y: gravity, z: 0 });
  }

  /** Loads the Rapier WASM module once, then creates a world. Gravity in m/s² (negative is down). */
  static async create(ecs: World, gravity = -14): Promise<Physics> {
    initialized ??= RAPIER.init();
    await initialized;
    return new Physics(ecs, gravity);
  }

  /** Drops every body and starts an empty world (called on room load). */
  reset(): void {
    this.rapierWorld.free();
    this.rapierWorld = new RAPIER.World({ x: 0, y: this.gravity, z: 0 });
    this.handles.clear();
    this.byCollider.clear();
  }

  /** Forces the entity's body to be rebuilt on the next sync (after editing Body or a static pose). */
  refresh(e: Entity): void {
    const h = this.handles.get(e);
    if (!h) return;
    this.byCollider.delete(h.collider.handle);
    if (h.kcc) this.rapierWorld.removeCharacterController(h.kcc);
    this.rapierWorld.removeRigidBody(h.body);
    this.handles.delete(e);
  }

  /** Creates the entity's body now if it has Body/CharacterBody but no body yet. */
  ensure(e: Entity): PhysicsHandle | undefined {
    const existing = this.handles.get(e);
    if (existing) return existing;
    const w = this.ecs;
    const t = w.get(e, Transform);
    if (!t || !w.isAlive(e)) return undefined;
    const body = w.get(e, Body);
    const ch = w.get(e, CharacterBody);
    if (!body && !ch) return undefined;
    const h = body
      ? createBodyHandle(this.rapierWorld, e, body, t)
      : createCharacterHandle(this.rapierWorld, e, ch!, t);
    this.handles.set(e, h);
    this.byCollider.set(h.collider.handle, e);
    return h;
  }

  /** Creates/removes Rapier bodies to match components; pushes kinematic poses from Transform. */
  sync(): void {
    const world = this.ecs;
    for (const [e, h] of this.handles) {
      const comp = h.kind === 'body' ? world.get(e, Body) : world.get(e, CharacterBody);
      if (!world.isAlive(e) || !comp) this.refresh(e);
    }
    for (const e of world.query(Body, Transform)) this.ensure(e);
    for (const e of world.query(CharacterBody, Transform)) this.ensure(e);
    for (const h of this.handles.values()) {
      if (!h.body.isKinematic()) continue;
      const t = world.get(h.entity, Transform);
      if (!t) continue;
      h.body.setNextKinematicTranslation(t.pos);
      if (h.kind === 'body') h.body.setNextKinematicRotation(t.rot);
    }
  }

  /** Advances the simulation and writes dynamic poses back into Transform. */
  step(dt: number, onCollision: CollisionSink): void {
    const world = this.ecs;
    this.rapierWorld.timestep = Math.min(dt, 1 / 20);
    this.rapierWorld.step(this.queue);
    for (const h of this.handles.values()) {
      if (!h.body.isDynamic()) continue;
      const t = world.get(h.entity, Transform);
      if (!t) continue;
      t.pos.copy(h.body.translation());
      t.rot.copy(h.body.rotation());
    }
    this.queue.drainCollisionEvents((h1, h2, started) => {
      const a = this.byCollider.get(h1);
      const b = this.byCollider.get(h2);
      if (a === undefined || b === undefined) return;
      const s1 = this.rapierWorld.getCollider(h1)?.isSensor();
      const s2 = this.rapierWorld.getCollider(h2)?.isSensor();
      onCollision(a, b, started, s1 ? 'a' : s2 ? 'b' : 'none');
    });
  }

  /** True if the entity currently has a physics body. */
  hasBody(e: Entity): boolean {
    return this.handles.has(e);
  }

  /** Entity that owns a Rapier collider handle (for advanced Rapier use). */
  entityOfCollider(handle: number): Entity | undefined {
    return this.byCollider.get(handle);
  }

  private need(e: Entity, what: string): PhysicsHandle {
    const h = this.ensure(e);
    if (h) return h;
    throw new EngineError({
      code: 'PHYSICS_NO_BODY',
      what: `physics.${what} called for entity #${e}, which has no physics body`,
      why: 'Bodies are created from Body or CharacterBody components (plus Transform).',
      fix: 'Give the prefab a Body or CharacterBody component.',
    });
  }

  /** Moves a CharacterBody by `delta` meters (slides, steps, snaps). Updates Transform immediately. */
  moveCharacter(e: Entity, delta: Vec3Like): MoveResult {
    const world = this.ecs;
    const h = this.need(e, 'moveCharacter');
    const t = world.need(e, Transform, 'physics.moveCharacter');
    if (!h.kcc)
      throw new EngineError({ code: 'PHYSICS_NOT_CHARACTER', what: `#${e} is not a CharacterBody` });
    h.body.setTranslation(t.pos, false);
    this.rapierWorld.propagateModifiedBodyPositionsToColliders();
    h.kcc.computeColliderMovement(
      h.collider,
      delta,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      h.collider.collisionGroups(),
      (c) => c.handle !== h.collider.handle,
    );
    const m = h.kcc.computedMovement();
    const moved = new Vector3(m.x, m.y, m.z);
    t.pos.add(moved);
    h.body.setNextKinematicTranslation(t.pos);
    const grounded = h.kcc.computedGrounded();
    const horizontalWanted = Math.hypot(delta.x, delta.z);
    const hitWall = horizontalWanted > 1e-4 && Math.hypot(m.x, m.z) < horizontalWanted * 0.5;
    const cb = world.get(e, CharacterBody);
    if (cb) cb.grounded = grounded;
    return { grounded, moved, hitWall };
  }

  /** Instantly places an entity (and its body) at a pose, clearing velocity. */
  teleport(e: Entity, pos: Vec3Like, rot?: Quaternion): void {
    const t = this.ecs.need(e, Transform, 'physics.teleport');
    t.pos.set(pos.x, pos.y, pos.z);
    if (rot) t.rot.copy(rot);
    const h = this.handles.get(e);
    if (!h) return;
    h.body.setTranslation(t.pos, true);
    if (h.kind === 'body') h.body.setRotation(t.rot, true);
    if (h.body.isKinematic()) h.body.setNextKinematicTranslation(t.pos);
    this.rapierWorld.propagateModifiedBodyPositionsToColliders();
    if (h.body.isDynamic()) {
      h.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      h.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }

  applyImpulse(e: Entity, impulse: Vec3Like, at?: Vec3Like): void {
    const h = this.ensure(e);
    if (!h?.body.isDynamic()) return;
    if (at) h.body.applyImpulseAtPoint(impulse, at, true);
    else h.body.applyImpulse(impulse, true);
  }

  setVelocity(e: Entity, v: Vec3Like): void {
    const h = this.ensure(e);
    if (h?.body.isDynamic()) h.body.setLinvel(v, true);
  }

  velocity(e: Entity): Vector3 {
    const h = this.handles.get(e);
    const v = h?.body.isDynamic() ? h.body.linvel() : { x: 0, y: 0, z: 0 };
    return new Vector3(v.x, v.y, v.z);
  }

  /** Total mass in kg of a dynamic body (0 for others). */
  mass(e: Entity): number {
    const h = this.handles.get(e);
    return h?.body.isDynamic() ? h.body.mass() : 0;
  }

  private filter(opts: QueryOpts): (c: RAPIER.Collider) => boolean {
    const ex =
      opts.exclude === undefined ? [] : typeof opts.exclude === 'number' ? [opts.exclude] : opts.exclude;
    if (!ex.length) return () => true;
    return (c) => !ex.includes(this.byCollider.get(c.handle) ?? -1);
  }

  /** First hit along a ray from `from` in direction `dir` (normalized internally), or null. */
  raycast(from: Vec3Like, dir: Vec3Like, maxDist: number, opts: QueryOpts = {}): RayHit | null {
    const d = new Vector3(dir.x, dir.y, dir.z).normalize();
    const ray = new RAPIER.Ray(from, d);
    const flags = opts.sensors ? undefined : RAPIER.QueryFilterFlags.EXCLUDE_SENSORS;
    const groups = queryGroups(opts.layers);
    const hit = this.rapierWorld.castRayAndGetNormal(
      ray,
      maxDist,
      true,
      flags,
      groups,
      undefined,
      undefined,
      this.filter(opts),
    );
    if (!hit) return null;
    const entity = this.byCollider.get(hit.collider.handle);
    if (entity === undefined) return null;
    const point = new Vector3(from.x, from.y, from.z).addScaledVector(d, hit.timeOfImpact);
    return {
      entity,
      point,
      normal: new Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
      distance: hit.timeOfImpact,
    };
  }

  /** True if nothing blocks the straight line between two points. */
  lineOfSight(from: Vec3Like, to: Vec3Like, opts: QueryOpts = {}): boolean {
    const d = new Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
    const len = d.length();
    if (len < 1e-6) return true;
    return this.raycast(from, d, len, opts) === null;
  }

  /** Entities whose colliders overlap a sphere. */
  overlapSphere(center: Vec3Like, radius: number, opts: QueryOpts = {}): Entity[] {
    const out = new Set<Entity>();
    const flags = opts.sensors ? undefined : RAPIER.QueryFilterFlags.EXCLUDE_SENSORS;
    const keep = this.filter(opts);
    this.rapierWorld.intersectionsWithShape(
      center,
      { x: 0, y: 0, z: 0, w: 1 },
      new RAPIER.Ball(radius),
      (c) => {
        const e = this.byCollider.get(c.handle);
        if (e !== undefined && keep(c)) out.add(e);
        return true;
      },
      flags,
      queryGroups(opts.layers),
    );
    return [...out];
  }
}
