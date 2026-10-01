import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/**
 * Weapon stats, as data on a weapon prefab (data/prefabs/weapons/*.json). The player's Arsenal
 * lists weapon prefab ids; pickups with kind "weapon" and item "<prefab id>" grant them.
 */
export const Weapon = defineComponent({
  name: 'Weapon',
  doc: 'Weapon stats: hitscan/projectile/melee, damage, spread, rate, ammo, magazine, effects.',
  schema: {
    name: field.string('Weapon'),
    slot: field.int(1, { min: 1, max: 9, doc: 'Number key that selects it' }),
    mode: field.enum(['hitscan', 'projectile', 'melee'], 'hitscan'),
    damage: field.number(20, { min: 0, doc: 'Per pellet (hitscan/melee)' }),
    pellets: field.int(1, { min: 1, max: 64 }),
    spread: field.number(1, { min: 0, max: 45, unit: 'deg', doc: 'Random cone half-angle' }),
    range: field.number(120, { min: 0.5, unit: 'm' }),
    rate: field.number(3, { min: 0.1, unit: 'shots/s' }),
    automatic: field.bool(false, { doc: 'Keeps firing while held' }),
    ammo: field.string('bullets', { doc: 'Inventory ammo type ("" = unlimited)' }),
    ammoPerShot: field.int(1, { min: 0 }),
    magazine: field.int(12, { min: 0, doc: '0 = fires straight from reserve (no reloads)' }),
    reloadTime: field.number(1.2, { min: 0, unit: 's' }),
    startAmmo: field.int(36, { min: 0, doc: 'Reserve ammo granted when first picked up' }),
    projectile: field.ref('prefab', '', { doc: 'Projectile mode: prefab spawned per shot' }),
    impulse: field.number(4, { min: 0, doc: 'Push on physics props per hit' }),
    kick: field.number(1.2, { min: 0, unit: 'deg', doc: 'Aim kick upward per shot' }),
    sound: field.ref('sound', 'pistol'),
    emptySound: field.ref('sound', 'empty'),
    reloadSound: field.ref('sound', 'reload'),
    muzzleEffect: field.ref('effect', 'muzzle'),
    impactEffect: field.ref('effect', 'impact'),
    tracer: field.ref('effect', 'tracer'),
    viewmodel: field.ref('puppet', '', { doc: 'First-person model' }),
  },
});
