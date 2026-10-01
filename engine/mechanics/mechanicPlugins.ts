import type { PluginDef } from '../core/definePlugin.ts';
import { AiPlugin } from './ai/AiPlugin.ts';
import { DoorsPlugin } from './doors/DoorsPlugin.ts';
import { HazardsPlugin } from './hazards/HazardsPlugin.ts';
import { HealthPlugin } from './health/HealthPlugin.ts';
import { InteractPlugin } from './interact/InteractPlugin.ts';
import { PickupsPlugin } from './pickups/PickupsPlugin.ts';
import { ProjectilesPlugin } from './projectiles/ProjectilesPlugin.ts';
import { SpawnersPlugin } from './spawners/SpawnersPlugin.ts';
import { TargetsPlugin } from './targets/TargetsPlugin.ts';

/** Genre-agnostic gameplay mechanics, in dependency order. Requires standardPlugins() first. */
export function mechanicPlugins(): PluginDef[] {
  return [
    HealthPlugin,
    ProjectilesPlugin,
    PickupsPlugin,
    DoorsPlugin,
    InteractPlugin,
    HazardsPlugin,
    TargetsPlugin,
    SpawnersPlugin,
    AiPlugin,
  ];
}
