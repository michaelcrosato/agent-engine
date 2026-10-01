import { Vector3 } from 'three';
import { Animator } from '../../anim/Animator.ts';
import type { Ctx } from '../../core/Ctx.ts';
import type { ComponentData } from '../../core/defineComponent.ts';
import { defineService } from '../../core/defineService.ts';
import { defineSystem } from '../../core/defineSystem.ts';
import { Transform } from '../../core/Transform.ts';
import type { Entity } from '../../core/World.ts';
import type { NavGrid } from '../../level/NavGrid.ts';
import { turnToward, yawOf, yawQuat, yawToward } from '../../math/yaw.ts';
import { CharacterBody } from '../../physics/CharacterBody.ts';
import { Health } from '../health/Health.ts';
import { attack } from './attack.ts';
import { Brain } from './Brain.ts';
import { perceive } from './perceive.ts';

export const NavKey = defineService<NavGrid | undefined>(
  'nav',
  'Grid pathfinding for the current room (undefined without a grid).',
);

type B = ComponentData<typeof Brain>;

function nearestPlayer(ctx: Ctx, from: Vector3): Entity | undefined {
  let best: Entity | undefined;
  let bestD = Infinity;
  for (const p of ctx.world.tagged('player')) {
    const h = ctx.world.get(p, Health);
    const t = ctx.world.get(p, Transform);
    if (!t || h?.dead) continue;
    const d = t.pos.distanceToSquared(from);
    if (d < bestD) [best, bestD] = [p, d];
  }
  return best;
}

/** Next point to walk toward: grid path to the goal when available, else straight at it. */
function steerPoint(ctx: Ctx, b: B, pos: Vector3, goal: Vector3): Vector3 {
  const nav = ctx.engine.tryService(NavKey);
  if (nav && ctx.time.elapsed >= b.repathAt) {
    b.repathAt = ctx.time.elapsed + 0.4 + ctx.rng.next() * 0.2;
    b.path = (nav.path(pos, goal) ?? []).map((v) => [v.x, v.y, v.z] as [number, number, number]);
  }
  while (b.path.length && Math.hypot(b.path[0]![0] - pos.x, b.path[0]![2] - pos.z) < 0.6) b.path.shift();
  const p = b.path[0];
  return p ? new Vector3(p[0], p[1], p[2]) : goal;
}

/** Runs every Brain: perceive, choose state, move with the character controller, attack. */
export const AiSystem = defineSystem({
  name: 'AiSystem',
  doc: 'Enemy brains: sight/hearing, chase via grid paths, melee/ranged/turret attacks.',
  phase: 'update',
  run(ctx) {
    const w = ctx.world;
    const dt = ctx.time.dt;
    for (const e of w.query(Brain, Transform)) {
      const b = w.get(e, Brain)!;
      const t = w.get(e, Transform)!;
      if (w.get(e, Health)?.dead) continue;
      b.cooldown = Math.max(0, b.cooldown - dt);
      const target = nearestPlayer(ctx, t.pos);
      const sees = target !== undefined && perceive(ctx, e, target, b);
      if (!sees && b.aggressive && target !== undefined) {
        b.target = target;
        b.lastSeen.copy(w.get(target, Transform)!.pos);
        b.lastSeenAt = ctx.time.elapsed;
        if (b.state === 'idle') b.state = 'chase';
      }
      if (sees) {
        if (b.state === 'idle' && b.alertSound) ctx.audio.play(b.alertSound, { at: t.pos });
        b.target = target;
        b.lastSeen.copy(w.get(target, Transform)!.pos);
        b.lastSeenAt = ctx.time.elapsed;
        if (b.state === 'idle') b.state = 'chase';
      } else if (b.state !== 'idle' && ctx.time.elapsed - b.lastSeenAt > 6) b.state = 'idle';
      const dist = target !== undefined ? t.pos.distanceTo(w.get(target, Transform)!.pos) : Infinity;
      if (b.state !== 'idle')
        b.state = sees && dist <= b.attackRange ? 'attack' : b.style === 'turret' ? 'idle' : 'chase';
      let moveTo: Vector3 | undefined;
      let face: Vector3 | undefined;
      if (b.state === 'attack' && target !== undefined) {
        face = w.get(target, Transform)!.pos;
        if (b.cooldown <= 0) {
          b.cooldown = 1 / b.attackRate;
          attack(ctx, e, target, b);
        }
      } else if (b.state === 'chase') {
        moveTo = steerPoint(ctx, b, t.pos, b.lastSeen);
        face = moveTo;
      }
      if (face) {
        const want = yawToward({ x: face.x - t.pos.x, z: face.z - t.pos.z });
        t.rot.copy(yawQuat(turnToward(yawOf(t.rot), want, b.turnRate * dt)));
      }
      const cb = w.get(e, CharacterBody);
      if (cb) {
        const v = cb.velocity;
        if (moveTo && Math.hypot(moveTo.x - t.pos.x, moveTo.z - t.pos.z) > 0.2) {
          const d = new Vector3(moveTo.x - t.pos.x, 0, moveTo.z - t.pos.z)
            .normalize()
            .multiplyScalar(b.speed);
          v.x = d.x;
          v.z = d.z;
        } else {
          v.x *= 0.7;
          v.z *= 0.7;
        }
        v.y = cb.grounded ? -1 : v.y - b.gravity * dt;
        const r = ctx.physics.moveCharacter(e, { x: v.x * dt, y: v.y * dt, z: v.z * dt });
        if (r.grounded && v.y < 0) v.y = -1;
      }
      const anim = w.get(e, Animator);
      if (anim) {
        const moving = cb ? Math.hypot(cb.velocity.x, cb.velocity.z) > 0.5 : false;
        anim.play =
          b.state === 'attack' && b.cooldown > 1 / b.attackRate - 0.35 ? 'attack' : moving ? 'walk' : 'idle';
      }
    }
  },
});
