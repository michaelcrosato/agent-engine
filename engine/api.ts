/**
 * The engine's public API. Game code (games/**) imports ONLY from here:
 *   import { defineComponent, defineSystem, field, ... } from '#engine/api.ts';
 * Engine internals import each other by relative path instead.
 */

export { z } from 'zod';
export { Animator } from './anim/Animator.ts';
export { Motion } from './anim/Motion.ts';
export { Mover } from './anim/Mover.ts';
export { AmbientSound } from './audio/AmbientSound.ts';
export { type ContentKind, defineContentKind } from './content/defineContentKind.ts';
// Runtime types
export type { Ctx } from './core/Ctx.ts';
// Definitions
export {
  type ComponentData,
  type ComponentInput,
  type ComponentType,
  defineComponent,
} from './core/defineComponent.ts';
export { defineEvent, type EventType } from './core/defineEvent.ts';
export { defineGame, type GameDef } from './core/defineGame.ts';
export { definePlugin, type PluginDef } from './core/definePlugin.ts';
export { defineService, type ServiceKey } from './core/defineService.ts';
export { defineSystem, type Phase, type SystemDef } from './core/defineSystem.ts';
export { Engine } from './core/Engine.ts';
export { EngineError } from './core/EngineError.ts';
export { Rng } from './core/Rng.ts';
export { Transform } from './core/Transform.ts';
export type { Entity, World } from './core/World.ts';
export { EffectSpawned } from './fx/effectEvents.ts';
export { spawnEffect } from './fx/spawnEffect.ts';
export { Arsenal } from './kits/fps/Arsenal.ts';
export { FpsController } from './kits/fps/FpsController.ts';
export { fpsKit } from './kits/fps/fpsKit.ts';
export { Weapon } from './kits/fps/Weapon.ts';
export { weaponData } from './kits/fps/weaponData.ts';
export { Reloaded, WeaponChanged, WeaponFired } from './kits/fps/weaponEvents.ts';
export { RoomLoaded } from './level/levelEvents.ts';
export { SpawnPoint } from './level/SpawnPoint.ts';
export { Counter } from './logic/Counter.ts';
export { LookChanged } from './logic/LookChanged.ts';
export { Message } from './logic/Message.ts';
export { RoomExit } from './logic/RoomExit.ts';
export { Signal } from './logic/Signal.ts';
export { runSignalSpec } from './logic/SignalQueue.ts';
// Helpers systems call
export { sendSignal } from './logic/sendSignal.ts';
export { Timer } from './logic/Timer.ts';
export { Trigger } from './logic/Trigger.ts';
export { turnToward, wrap180, yawOf, yawQuat, yawToward } from './math/yaw.ts';
export { Brain } from './mechanics/ai/Brain.ts';
export { Door } from './mechanics/doors/Door.ts';
export { Hazard } from './mechanics/hazards/Hazard.ts';
export { applyDamage, heal, hp } from './mechanics/health/applyDamage.ts';
export { Health } from './mechanics/health/Health.ts';
export { Damaged, Died, Healed } from './mechanics/health/healthEvents.ts';
export { Respawn } from './mechanics/health/Respawn.ts';
export { Interactable } from './mechanics/interact/Interactable.ts';
export { Interactor } from './mechanics/interact/Interactor.ts';
export { Used } from './mechanics/interact/InteractSystem.ts';
export { mechanicPlugins } from './mechanics/mechanicPlugins.ts';
export { Inventory } from './mechanics/pickups/Inventory.ts';
export { Pickup } from './mechanics/pickups/Pickup.ts';
export { PickedUp } from './mechanics/pickups/pickupEvents.ts';
export { Explosive } from './mechanics/projectiles/Explosive.ts';
export { Exploded, explode } from './mechanics/projectiles/explode.ts';
export { Projectile } from './mechanics/projectiles/Projectile.ts';
export { Spawner } from './mechanics/spawners/Spawner.ts';
export { Spawned } from './mechanics/spawners/SpawnerSystem.ts';
export { Target } from './mechanics/targets/Target.ts';
export { Scored } from './mechanics/targets/TargetSystem.ts';
export { Model } from './model/Model.ts';
// Common components
export { Body } from './physics/Body.ts';
export { CharacterBody } from './physics/CharacterBody.ts';
// Common events
export { Contact, TriggerEntered, TriggerExited } from './physics/physicsEvents.ts';
export { CameraRig } from './render/CameraRig.ts';
export { Label } from './render/Label.ts';
export { Light } from './render/Light.ts';
export { viewRay } from './render/viewRay.ts';
export { field } from './schema/field.ts';
// Plugin bundles
export { standardPlugins } from './standardPlugins.ts';
