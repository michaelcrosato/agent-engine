import { defineSystem } from '../core/defineSystem.ts';
import { Signal } from '../logic/Signal.ts';
import { Animator } from './Animator.ts';

/** Lets level logic change animations: a "play:<clip or role>" signal sets Animator.play. */
export const AnimatorSignalSystem = defineSystem({
  name: 'AnimatorSignalSystem',
  doc: 'Handles "play:<clip>" signals for entities with an Animator.',
  phase: 'update',
  run(ctx) {
    for (const s of ctx.events.read(Signal)) {
      if (!s.action.startsWith('play:')) continue;
      const a = ctx.world.get(s.target, Animator);
      if (a) a.play = s.action.slice(5);
    }
  },
});
