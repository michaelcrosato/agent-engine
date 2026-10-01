import { definePlugin } from '../../core/definePlugin.ts';
import { Door } from './Door.ts';
import { DoorSystem } from './DoorSystem.ts';

/** Doors that open by proximity, key, or signal (moved by Mover). */
export const DoorsPlugin = definePlugin({
  name: 'doors',
  doc: 'Door component: proximity/key/signal doors that drive a Mover.',
  components: [Door],
  systems: [DoorSystem],
  requires: ['anim', 'logic'],
});
