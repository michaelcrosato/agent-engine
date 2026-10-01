import type { Physics } from '../physics/Physics.ts';
import { EngineError } from './EngineError.ts';

/** Placeholder for `engine.physics` until PhysicsPlugin runs; any use explains how to fix it. */
export const missingPhysics = new Proxy({} as Physics, {
  get(_target, prop) {
    throw new EngineError({
      code: 'PHYSICS_MISSING',
      what: `physics.${String(prop)} was used, but no physics plugin is installed`,
      why: 'engine.physics is set by PhysicsPlugin.setup().',
      fix: 'Add PhysicsPlugin to the game plugins (standardPlugins() includes it).',
    });
  },
});
