import { definePlugin } from '../core/definePlugin.ts';
import { Counter } from './Counter.ts';
import { LogicSystem } from './LogicSystem.ts';
import { Message } from './Message.ts';
import { RoomExit } from './RoomExit.ts';
import { Signal } from './Signal.ts';
import { SignalQueue, SignalQueueKey } from './SignalQueue.ts';
import { Timer } from './Timer.ts';
import { Trigger } from './Trigger.ts';
import { TriggerSystem } from './TriggerSystem.ts';

/** Data-driven level scripting: signals between named entities, triggers, counters, timers, exits. */
export const LogicPlugin = definePlugin({
  name: 'logic',
  doc: 'Signals, Trigger volumes, Counter, Timer, RoomExit, and on-screen Messages.',
  components: [Trigger, Counter, Timer, RoomExit],
  systems: [LogicSystem, TriggerSystem],
  events: [Signal, Message],
  setup(engine) {
    engine.provide(SignalQueueKey, new SignalQueue());
  },
  roomLoad(engine) {
    engine.service(SignalQueueKey).pending.length = 0;
  },
});
