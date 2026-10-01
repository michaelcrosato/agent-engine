import { definePlugin } from '../core/definePlugin.ts';
import { Body } from './Body.ts';
import { CharacterBody } from './CharacterBody.ts';
import { Physics } from './Physics.ts';
import { PhysicsSystem } from './PhysicsSystem.ts';
import { Contact, TriggerEntered, TriggerExited } from './physicsEvents.ts';

/** Rapier physics: rigid bodies, sensors, character controllers, raycasts. */
export const PhysicsPlugin = definePlugin({
  name: 'physics',
  doc: 'Rapier physics: Body (rigid bodies, sensors), CharacterBody (kinematic capsules), scene queries.',
  components: [Body, CharacterBody],
  systems: [PhysicsSystem],
  events: [TriggerEntered, TriggerExited, Contact],
  async setup(engine) {
    engine.physics = await Physics.create(engine.world);
  },
  roomLoad(engine) {
    engine.physics.reset();
  },
  roomReady(engine) {
    engine.physics.sync();
  },
});
