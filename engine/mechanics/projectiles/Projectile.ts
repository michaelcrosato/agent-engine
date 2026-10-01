import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

/**
 * A moving shot (rocket, fireball, grenade). It flies along its Transform's forward (-Z) at
 * `speed`, ray-tests each tick, and on impact deals damage, optional splash, and effects.
 */
export const Projectile = defineComponent({
  name: 'Projectile',
  doc: 'Ray-stepped projectile with direct damage, optional splash, gravity, and lifetime.',
  schema: {
    speed: field.number(30, { min: 0, unit: 'm/s' }),
    gravity: field.number(0, { doc: 'Downward acceleration (grenades ~ 12)', unit: 'm/s²' }),
    damage: field.number(25, { min: 0 }),
    splashRadius: field.number(0, { min: 0, unit: 'm', doc: '0 = no splash' }),
    splashDamage: field.number(0, { min: 0 }),
    impulse: field.number(6, { min: 0, doc: 'Knockback at the splash center' }),
    lifetime: field.number(5, { min: 0.05, unit: 's' }),
    bounces: field.int(0, { min: 0, doc: 'Bounce off surfaces this many times before exploding' }),
    hitEffect: field.ref('effect', '', { doc: 'Effect at impact (or explosion)' }),
    owner: field.int(-1, { doc: 'State: who fired it (not hit by its own shot)' }),
    age: field.number(0, { doc: 'State: seconds alive' }),
    velocity: field.vec3(0, { doc: 'State: current velocity' }),
    started: field.bool(false, { doc: 'State: initial velocity set' }),
  },
});
