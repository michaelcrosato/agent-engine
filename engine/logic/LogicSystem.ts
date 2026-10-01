import { defineSystem } from '../core/defineSystem.ts';
import { Counter } from './Counter.ts';
import { RoomExit } from './RoomExit.ts';
import { Signal } from './Signal.ts';
import { runSignalSpec, SignalQueueKey } from './SignalQueue.ts';
import { Timer } from './Timer.ts';

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
