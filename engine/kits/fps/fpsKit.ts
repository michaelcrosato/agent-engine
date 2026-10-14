import type { PluginDef } from '../../core/definePlugin.ts';
import { mechanicPlugins } from '../../mechanics/mechanicPlugins.ts';
import { standardPlugins } from '../../standardPlugins.ts';
import { FpsPlugin } from './FpsPlugin.ts';

/**
 * Every plugin an FPS game needs: standard engine plugins, generic mechanics, and the FPS kit.
 * Use it as the whole list or spread it and append game plugins:
 * `plugins: [...fpsKit(), MyMechanicPlugin]`.
 */
export function fpsKit(options: { hud?: boolean } = {}): PluginDef[] {
  const fps =
    options.hud === false
      ? { ...FpsPlugin, systems: FpsPlugin.systems.filter((s) => s.name !== 'HudSystem') }
      : FpsPlugin;
  return [...standardPlugins(), ...mechanicPlugins(), fps];
}
