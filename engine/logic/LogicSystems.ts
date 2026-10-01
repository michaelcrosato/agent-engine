import type { Ctx } from '../core/Ctx.ts';
import { defineSystem } from '../core/defineSystem.ts';
import { TriggerEntered, TriggerExited } from '../physics/physicsEvents.ts';
import { Counter } from './Counter.ts';
import { RoomExit } from './RoomExit.ts';
import { Signal } from './Signal.ts';
import { runSignalSpec, SignalQueueKey } from './SignalQueue.ts';
import { Timer } from './Timer.ts';
import { Trigger } from './Trigger.ts';

function matches(ctx: Ctx, filter: string, other: number): boolean {
  return filter === 'any' || ctx.world.hasTag(other, filter);
}

/** Runs Trigger specs and RoomExits from sensor enter/exit events. */
export const TriggerSystem = defineSystem({
  name: 'TriggerSystem',
  doc: 'Turns TriggerEntered/TriggerExited events into Trigger signals and RoomExit room loads.',
  phase: 'late',
  run(ctx) {
    const w = ctx.world;
    for (const ev of ctx.events.read(TriggerEntered)) {
      const exit = w.get(ev.trigger, RoomExit);
      if (exit && !exit.locked && exit.room && w.hasTag(ev.other, 'player')) {
        ctx.engine.requestRoom(exit.room, { spawn: exit.spawn });
      }
      const tr = w.get(ev.trigger, Trigger);
      if (!tr || !matches(ctx, tr.filter, ev.other)) continue;
      tr.inside++;
      if (tr.once && tr.fired > 0) continue;
      tr.fired++;
      for (const spec of tr.onEnter) runSignalSpec(ctx, spec, ev.trigger);
    }
    for (const ev of ctx.events.read(TriggerExited)) {
      const tr = w.get(ev.trigger, Trigger);
      if (!tr || !matches(ctx, tr.filter, ev.other)) continue;
      tr.inside = Math.max(0, tr.inside - 1);
      if (tr.once && tr.fired > 1) continue;
      for (const spec of tr.onExit) runSignalSpec(ctx, spec, ev.trigger);
    }
  },
});

/** Counters, timers, room-exit locks, and delayed signals. */
export const LogicSystem = defineSystem({
  name: 'LogicSystem',
  doc: 'Updates Counter and Timer components, RoomExit locks, and sends delayed signals.',
  phase: 'update',
  run(ctx) {
    const w = ctx.world;
    const signals = ctx.events.read(Signal);
    for (const s of signals) {
      const c = w.get(s.target, Counter);
      if (c && s.action === 'add') c.count += s.value || 1;
      if (c && s.action === 'reset') {
        c.count = 0;
        c.done = false;
      }
      const t = w.get(s.target, Timer);
      if (t && s.action === 'start') {
        t.running = true;
        t.left = t.seconds;
      }
      if (t && s.action === 'stop') t.running = false;
      const exit = w.get(s.target, RoomExit);
      if (exit && (s.action === 'unlock' || s.action === 'lock')) exit.locked = s.action === 'lock';
    }
    for (const e of w.query(Counter)) {
      const c = w.get(e, Counter)!;
      if (c.done || c.count < c.goal) continue;
      c.done = true;
      for (const spec of c.onReach) runSignalSpec(ctx, spec, e);
    }
    for (const e of w.query(Timer)) {
      const t = w.get(e, Timer)!;
      if (t.autostart && !t.started) {
        t.started = true;
        t.running = true;
        t.left = t.seconds;
      }
      if (!t.running) continue;
      t.left -= ctx.time.dt;
      if (t.left > 0) continue;
      for (const spec of t.onFire) runSignalSpec(ctx, spec, e);
      if (t.repeat) t.left += t.seconds;
      else t.running = false;
    }
    const q = ctx.service(SignalQueueKey);
    const due = q.pending.filter((p) => p.at <= ctx.time.elapsed);
    if (!due.length) return;
    q.pending.splice(0, q.pending.length, ...q.pending.filter((p) => p.at > ctx.time.elapsed));
    for (const p of due) runSignalSpec(ctx, p.spec, p.from);
  },
});
