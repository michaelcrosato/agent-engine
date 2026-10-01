import { definePlugin } from '../../core/definePlugin.ts';
import { Target } from './Target.ts';
import { Scored, TargetSystem } from './TargetSystem.ts';

/** Shooting-range targets and the Scored event. */
export const TargetsPlugin = definePlugin({
  name: 'targets',
  doc: 'Knock-down Targets that emit Scored and reset.',
  components: [Target],
  systems: [TargetSystem],
  events: [Scored],
  requires: ['health'],
});
