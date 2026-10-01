import type { Ctx } from '../../core/Ctx.ts';
import type { ComponentData } from '../../core/defineComponent.ts';
import { defineSystem } from '../../core/defineSystem.ts';
import type { Entity } from '../../core/World.ts';
import { Health } from '../../mechanics/health/Health.ts';
import { Inventory } from '../../mechanics/pickups/Inventory.ts';
import { Arsenal } from './Arsenal.ts';
import { fireWeapon } from './fireWeapon.ts';
import { type WeaponData, weaponData } from './weaponData.ts';
import { Reloaded, WeaponChanged } from './weaponEvents.ts';

type A = ComponentData<typeof Arsenal>;

/** Rounds in the current magazine (missing = full, e.g. starting weapons). */
export function magOf(a: A, id: string, wd: WeaponData): number {
  return a.mags[id] ?? wd.magazine;
}

function reserve(ctx: Ctx, e: Entity, wd: WeaponData): number {
  return wd.ammo ? (ctx.world.get(e, Inventory)?.ammo[wd.ammo] ?? 0) : Infinity;
}

function startReload(ctx: Ctx, e: Entity, a: A, id: string, wd: WeaponData): void {
  if (wd.magazine <= 0 || a.reloading > 0 || magOf(a, id, wd) >= wd.magazine || reserve(ctx, e, wd) <= 0)
    return;
  a.reloading = wd.reloadTime;
  if (wd.reloadSound) ctx.audio.play(wd.reloadSound);
  ctx.events.emit(Reloaded, { entity: e, weapon: id });
}

function finishReload(ctx: Ctx, e: Entity, a: A, id: string, wd: WeaponData): void {
  const inv = ctx.world.get(e, Inventory);
  const take = Math.min(wd.magazine - magOf(a, id, wd), reserve(ctx, e, wd));
  a.mags[id] = magOf(a, id, wd) + take;
  if (inv && wd.ammo) inv.ammo[wd.ammo] = (inv.ammo[wd.ammo] ?? 0) - take;
}

/** Index of the weapon the player asked for this tick (slot keys, wheel), or undefined. */
function requested(ctx: Ctx, a: A): number | undefined {
  const n = a.weapons.length;
  if (!n) return undefined;
  if (ctx.input.pressed('nextWeapon')) return (a.current + 1 + n) % n;
  if (ctx.input.pressed('prevWeapon')) return (a.current - 1 + n) % n;
  for (let slot = 1; slot <= 9; slot++) {
    if (!ctx.input.pressed(`weapon${slot}`)) continue;
    const i = a.weapons.findIndex((id) => weaponData(ctx.content, id).slot === slot);
    if (i >= 0) return i;
  }
  return undefined;
}

/** Selects weapons, reloads, and fires on input for entities with an Arsenal. */
export const WeaponSystem = defineSystem({
  name: 'WeaponSystem',
  doc: 'Weapon switching, reloading, ammo, and firing for Arsenal owners (the player).',
  phase: 'update',
  run(ctx) {
    const w = ctx.world;
    const dt = ctx.time.dt;
    for (const e of w.query(Arsenal)) {
      const a = w.get(e, Arsenal)!;
      if (w.get(e, Health)?.dead) continue;
      a.cooldown = Math.max(0, a.cooldown - dt);
      a.switching = Math.max(0, a.switching - dt);
      if (a.current < 0 && a.weapons.length) a.current = 0;
      const want = requested(ctx, a);
      if (want !== undefined && want !== a.current) {
        a.current = want;
        a.switching = 0.3;
        a.reloading = 0;
        ctx.events.emit(WeaponChanged, { entity: e, weapon: a.weapons[want]! });
      }
      const id = a.weapons[a.current];
      if (!id) continue;
      const wd = weaponData(ctx.content, id);
      if (a.reloading > 0) {
        a.reloading -= dt;
        if (a.reloading <= 0) finishReload(ctx, e, a, id, wd);
        continue;
      }
      if (ctx.input.pressed('reload')) startReload(ctx, e, a, id, wd);
      const pull = wd.automatic ? ctx.input.down('fire') : ctx.input.pressed('fire');
      if (!pull || a.cooldown > 0 || a.switching > 0 || a.reloading > 0) continue;
      const loaded = wd.magazine > 0 ? magOf(a, id, wd) : reserve(ctx, e, wd);
      if (wd.ammo && loaded < wd.ammoPerShot) {
        if (ctx.input.pressed('fire') && wd.emptySound) ctx.audio.play(wd.emptySound);
        startReload(ctx, e, a, id, wd);
        continue;
      }
      if (wd.ammo && wd.magazine > 0) a.mags[id] = magOf(a, id, wd) - wd.ammoPerShot;
      else if (wd.ammo) w.get(e, Inventory)!.ammo[wd.ammo] = reserve(ctx, e, wd) - wd.ammoPerShot;
      a.cooldown = 1 / wd.rate;
      a.shots++;
      fireWeapon(ctx, e, id, wd);
      if (wd.ammo && wd.magazine > 0 && magOf(a, id, wd) < wd.ammoPerShot) startReload(ctx, e, a, id, wd);
    }
  },
});
