import { definePlugin } from '../../core/definePlugin.ts';
import { NavGrid } from '../../level/NavGrid.ts';
import { AiSystem, NavKey } from './AiSystem.ts';
import { Brain } from './Brain.ts';

/** Enemy AI brains and per-room grid navigation. */
export const AiPlugin = definePlugin({
  name: 'ai',
  doc: 'Brain component (melee/ranged/turret enemies) and NavKey grid pathfinding.',
  components: [Brain],
  systems: [AiSystem],
  requires: ['health', 'projectiles'],
  roomReady(engine) {
    engine.provide(NavKey, engine.grid ? new NavGrid(engine.grid) : undefined);
  },
});
