import { definePlugin } from '../../core/definePlugin.ts';
import { Arsenal } from './Arsenal.ts';
import { FpsCameraFxSystem } from './FpsCameraFxSystem.ts';
import { FpsController } from './FpsController.ts';
import { FpsControllerSystem } from './FpsControllerSystem.ts';
import { HudSystem } from './HudSystem.ts';
import { ViewmodelSystem } from './ViewmodelSystem.ts';
import { Weapon } from './Weapon.ts';
import { WeaponPickupSystem } from './WeaponPickupSystem.ts';
import { WeaponSystem } from './WeaponSystem.ts';
import { Reloaded, WeaponChanged, WeaponFired } from './weaponEvents.ts';

/** First-person shooter kit: controller, weapons, viewmodel, HUD. */
export const FpsPlugin = definePlugin({
  name: 'fps',
  doc: 'FpsController, Weapon (prefab data), Arsenal; viewmodel and HUD in the browser.',
  components: [FpsController, Weapon, Arsenal],
  systems: [
    FpsControllerSystem,
    WeaponSystem,
    WeaponPickupSystem,
    FpsCameraFxSystem,
    ViewmodelSystem,
    HudSystem,
  ],
  events: [WeaponFired, WeaponChanged, Reloaded],
  requires: ['physics', 'health', 'pickups', 'effects', 'projectiles', 'interact'],
  data: 'kit:fps',
});
