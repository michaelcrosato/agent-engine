import { AnimPlugin } from './anim/AnimPlugin.ts';
import { AudioPlugin } from './audio/AudioPlugin.ts';
import type { PluginDef } from './core/definePlugin.ts';
import { EffectsPlugin } from './fx/EffectsPlugin.ts';
import { LevelPlugin } from './level/LevelPlugin.ts';
import { LogicPlugin } from './logic/LogicPlugin.ts';
import { PhysicsPlugin } from './physics/PhysicsPlugin.ts';
import { RenderPlugin } from './render/RenderPlugin.ts';

/**
 * The engine plugins almost every game wants, in dependency order:
 * physics, level, logic, anim, audio, render, effects. Spread into `defineGame({ plugins: [...] })`.
 */
export function standardPlugins(): PluginDef[] {
  return [PhysicsPlugin, LevelPlugin, LogicPlugin, AnimPlugin, AudioPlugin, RenderPlugin, EffectsPlugin];
}
