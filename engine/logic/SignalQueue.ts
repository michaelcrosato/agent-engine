import type { Ctx } from '../core/Ctx.ts';
import { defineService } from '../core/defineService.ts';
import { Transform } from '../core/Transform.ts';
import type { Entity } from '../core/World.ts';
import { LookChanged } from './LookChanged.ts';
import { Message } from './Message.ts';
import type { SignalSpec } from './SignalSpec.ts';
import { sendSignal } from './sendSignal.ts';

type Pending = { at: number; spec: SignalSpec; from: Entity | undefined };

/** Signals waiting for their delay; flushed by SignalQueueSystem. */
export class SignalQueue {
  readonly pending: Pending[] = [];
}

export const SignalQueueKey = defineService<SignalQueue>(
  'signalQueue',
  'Delayed signals waiting to be sent.',
);

/** Runs a SignalSpec now (delay 0) or queues it. Sends the signal and/or shows the message. */
export function runSignalSpec(ctx: Ctx, spec: SignalSpec, from?: Entity): void {
  if (spec.delay > 0) {
    ctx
      .service(SignalQueueKey)
      .pending.push({ at: ctx.time.elapsed + spec.delay, spec: { ...spec, delay: 0 }, from });
    return;
  }
  if (spec.message) ctx.events.emit(Message, { text: spec.message, seconds: 3 });
  if (spec.sound)
    ctx.audio.play(spec.sound, from !== undefined ? { at: ctx.world.get(from, Transform)?.pos } : {});
  if (spec.music) ctx.audio.music(spec.music === 'none' ? null : spec.music);
  if (spec.look) ctx.events.emit(LookChanged, { look: spec.look });
  if (spec.target) sendSignal(ctx, spec.target, spec.action, from, spec.value);
}
