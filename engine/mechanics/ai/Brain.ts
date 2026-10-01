import { z } from 'zod';
import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/**
 * Enemy AI: notices the player by sight (cone + line of sight) or hearing (radius), chases along
 * the room's grid, and attacks in melee, at range (projectile prefab or hitscan), or as a turret.
 * Moving brains need a CharacterBody; turrets need only a Transform.
 */
export const Brain = defineComponent({
  name: 'Brain',
  doc: 'Enemy AI: idle → chase → attack (melee, ranged, turret) with sight checks and pathfinding.',
  schema: {
    style: field.enum(['melee', 'ranged', 'turret'], 'melee'),
    sight: field.number(20, { min: 0, unit: 'm' }),
    fov: field.number(140, { min: 1, max: 360, unit: 'deg' }),
    hearing: field.number(6, { min: 0, unit: 'm', doc: 'Notices the player this close, even behind it' }),
    speed: field.number(3.5, { min: 0, unit: 'm/s' }),
    turnRate: field.number(300, { min: 1, unit: 'deg/s' }),
    attackRange: field.number(1.8, { min: 0.1, unit: 'm' }),
    attackDamage: field.number(10, { min: 0 }),
    attackRate: field.number(1, { min: 0.05, unit: '1/s' }),
    projectile: field.ref('prefab', '', { doc: 'Ranged: projectile prefab (empty = hitscan)' }),
    tracer: field.ref('effect', 'tracer-enemy', { doc: 'Ranged hitscan visual' }),
    aimError: field.number(3, { min: 0, unit: 'deg' }),
    eye: field.number(1.5, { min: 0, unit: 'm', doc: 'Eye height above origin' }),
    aggressive: field.bool(false, { doc: 'Always knows where the player is (wave enemies)' }),
    gravity: field.number(20, { unit: 'm/s²' }),
    alertSound: field.ref('sound', 'alert'),
    attackSound: field.ref('sound', ''),
    state: field.enum(['idle', 'chase', 'attack'], 'idle', { doc: 'State' }),
    target: field.int(-1, { doc: 'State: entity being hunted' }),
    lastSeen: field.vec3(0, { doc: 'State: where the target was last seen' }),
    lastSeenAt: field.number(-999, { doc: 'State' }),
    cooldown: field.number(0, { doc: 'State: seconds until the next attack' }),
    path: field.list(z.tuple([z.number(), z.number(), z.number()]), [], { doc: 'State: waypoints' }),
    repathAt: field.number(0, { doc: 'State' }),
  },
});
