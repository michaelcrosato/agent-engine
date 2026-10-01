import { defineComponent } from '../../core/defineComponent.ts';
import { SignalSpecSchema } from '../../logic/SignalSpec.ts';
import { field } from '../../schema/field.ts';

/** Hit points. Damage via `applyDamage`; emits Damaged and Died events. */
export const Health = defineComponent({
  name: 'Health',
  doc: 'Hit points with armor, regeneration, and on-death behavior (destroy, spawn, signals).',
  schema: {
    max: field.number(100, { min: 1, unit: 'hp' }),
    current: field.number(-1, { doc: 'Starts at max when -1' }),
    armor: field.number(0, { min: 0, doc: 'Armor points; absorb `armorAbsorb` of each hit' }),
    armorAbsorb: field.number(0.6, { min: 0, max: 1 }),
    regen: field.number(0, { min: 0, unit: 'hp/s' }),
    regenDelay: field.number(3, { min: 0, unit: 's', doc: 'Seconds after a hit before regen starts' }),
    invulnerable: field.bool(false),
    destroyOnDeath: field.bool(true),
    deathPrefab: field.ref('prefab', '', { doc: 'Spawned where it dies (explosion, gibs)' }),
    deathEffect: field.ref('effect', '', { doc: 'Effect played where it dies' }),
    hurtSound: field.ref('sound', '', { doc: 'Played on each hit' }),
    onDeath: field.list(SignalSpecSchema, [], { doc: 'Signals/messages when it dies' }),
    dead: field.bool(false, { doc: 'State' }),
    lastHit: field.number(-999, { doc: 'State: sim time of the last damage' }),
  },
});
