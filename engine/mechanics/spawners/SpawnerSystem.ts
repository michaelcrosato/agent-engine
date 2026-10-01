import { Vector3 } from 'three';
import type { Ctx } from '../../core/Ctx.ts';
import type { ComponentData } from '../../core/defineComponent.ts';
import { defineEvent } from '../../core/defineEvent.ts';
import { defineSystem } from '../../core/defineSystem.ts';
import { Transform } from '../../core/Transform.ts';
import type { Entity } from '../../core/World.ts';
import { spawnEffect } from '../../fx/spawnEffect.ts';
import { Signal } from '../../logic/Signal.ts';
import { Spawner } from './Spawner.ts';

export const Spawned = defineEvent<{ spawner: Entity; entity: Entity }>(
  'Spawned',
  'A Spawner created an entity.',
);

function spawnBatch(ctx: Ctx, e: Entity, s: ComponentData<typeof Spawner>): void {
  const t = ctx.world.get(e, Transform)!;
  for (let i = 0; i < s.count; i++) {
    if (s.alive.length >= s.max || (s.total > 0 && s.spawned >= s.total)) return;
    const a = ctx.rng.next() * Math.PI * 2;
    const r = s.radius * Math.sqrt(ctx.rng.next());
    const pos = new Vector3(t.pos.x + Math.cos(a) * r, t.pos.y, t.pos.z + Math.sin(a) * r);
    const child = ctx.spawn(s.prefab, { pos, rot: t.rot.clone() });
    s.alive.push(child);
    s.spawned++;
    if (s.effect) spawnEffect(ctx, s.effect, pos);
    ctx.events.emit(Spawned, { spawner: e, entity: child });
  }
}

/** Runs Spawners: "spawn"/"start"/"stop" signals and interval timers. */
export const SpawnerSystem = defineSystem({
  name: 'SpawnerSystem',
  doc: 'Spawns prefabs from Spawner entities on signals or intervals.',
  phase: 'update',
  run(ctx) {
    const w = ctx.world;
    const signals = ctx.events.read(Signal);
    for (const e of w.query(Spawner, Transform)) {
      const s = w.get(e, Spawner)!;
      if (!s.prefab) continue;
      s.alive = s.alive.filter((x) => w.isAlive(x));
      for (const sig of signals) {
        if (sig.target !== e) continue;
        if (sig.action === 'spawn') spawnBatch(ctx, e, s);
        else if (sig.action === 'start') s.active = true;
        else if (sig.action === 'stop') s.active = false;
      }
      if (s.interval <= 0 || !s.active || ctx.time.elapsed < s.next) continue;
      s.next = ctx.time.elapsed + s.interval;
      spawnBatch(ctx, e, s);
    }
  },
});
