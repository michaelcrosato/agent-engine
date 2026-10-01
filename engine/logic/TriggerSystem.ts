import type { Ctx } from '../core/Ctx.ts';
import { defineSystem } from '../core/defineSystem.ts';
import { TriggerEntered, TriggerExited } from '../physics/physicsEvents.ts';
import { RoomExit } from './RoomExit.ts';
import { runSignalSpec } from './SignalQueue.ts';
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
