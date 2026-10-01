import { Euler, Quaternion } from 'three';
import { defineEvent } from '../../core/defineEvent.ts';
import { defineSystem } from '../../core/defineSystem.ts';
import { Transform } from '../../core/Transform.ts';
import type { Entity } from '../../core/World.ts';
import { runSignalSpec } from '../../logic/SignalQueue.ts';
import { Health } from '../health/Health.ts';
import { Died } from '../health/healthEvents.ts';
import { Target } from './Target.ts';

export const Scored = defineEvent<{ target: Entity; points: number; by: Entity | undefined }>(
  'Scored',
  'A Target was knocked down.',
);

const TIP = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0));

/** Knocks targets down on death, scores, and resets them after resetTime. */
export const TargetSystem = defineSystem({
  name: 'TargetSystem',
  doc: 'Shooting-range targets: knock down, score, reset.',
  phase: 'late',
  run(ctx) {
    const w = ctx.world;
    for (const d of ctx.events.read(Died)) {
      const tg = w.get(d.entity, Target);
      const t = w.get(d.entity, Transform);
      if (!tg || !t || tg.down) continue;
      tg.down = true;
      tg.hits++;
      tg.downAt = ctx.time.elapsed;
      t.rot.multiply(TIP);
      ctx.events.emit(Scored, { target: d.entity, points: tg.points, by: d.from });
      for (const spec of tg.onHit) runSignalSpec(ctx, spec, d.entity);
    }
    for (const e of w.query(Target, Health, Transform)) {
      const tg = w.get(e, Target)!;
      if (!tg.down || tg.resetTime <= 0 || ctx.time.elapsed - tg.downAt < tg.resetTime) continue;
      tg.down = false;
      w.get(e, Transform)!.rot.multiply(TIP.clone().invert());
      const h = w.get(e, Health)!;
      h.dead = false;
      h.current = h.max;
    }
  },
});
