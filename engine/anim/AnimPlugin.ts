import { definePlugin } from '../core/definePlugin.ts';
import { Animator } from './Animator.ts';
import { AnimatorSystem } from './AnimatorSystem.ts';
import { ClipKind } from './Clip.ts';
import { Motion } from './Motion.ts';
import { MotionSystem } from './MotionSystem.ts';
import { Mover } from './Mover.ts';
import { MoverSystem } from './MoverSystem.ts';

/** Animation: clips on puppets (visual), Mover waypoints and Motion spin/bob (gameplay ticks). */
export const AnimPlugin = definePlugin({
  name: 'anim',
  doc: 'Animator (clips on puppets), Mover (platforms/doors), Motion (spin/bob).',
  components: [Animator, Mover, Motion],
  systems: [MoverSystem, MotionSystem, AnimatorSystem],
  contentKinds: [ClipKind],
});
