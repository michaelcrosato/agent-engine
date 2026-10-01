import { defineSystem } from '../../core/defineSystem.ts';
import { Inventory } from '../../mechanics/pickups/Inventory.ts';
import { PickedUp } from '../../mechanics/pickups/pickupEvents.ts';
import { Arsenal } from './Arsenal.ts';
import { weaponData } from './weaponData.ts';
import { WeaponChanged } from './weaponEvents.ts';

/** Grants weapons from pickups with kind "weapon" (new weapons are selected; owned ones give ammo). */
export const WeaponPickupSystem = defineSystem({
  name: 'WeaponPickupSystem',
  doc: 'Adds picked-up weapons to the Arsenal and their starting ammo to the Inventory.',
  phase: 'late',
  order: 10,
  run(ctx) {
    const w = ctx.world;
    for (const ev of ctx.events.read(PickedUp)) {
      if (ev.kind !== 'weapon') continue;
      const a = w.get(ev.picker, Arsenal);
      if (!a || !ev.item) continue;
      const wd = weaponData(ctx.content, ev.item);
      const inv = w.get(ev.picker, Inventory);
      if (inv && wd.ammo) inv.ammo[wd.ammo] = (inv.ammo[wd.ammo] ?? 0) + wd.startAmmo;
      if (a.weapons.includes(ev.item)) continue;
      a.weapons.push(ev.item);
      a.mags[ev.item] = wd.magazine;
      a.current = a.weapons.length - 1;
      a.switching = 0.3;
      ctx.events.emit(WeaponChanged, { entity: ev.picker, weapon: ev.item });
    }
  },
});
