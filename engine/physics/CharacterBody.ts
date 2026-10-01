import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';
import { LAYER_NAMES } from './layers.ts';

/**
 * A kinematic capsule for players and NPCs, moved with `ctx.physics.moveCharacter(e, delta)`
 * (slides along walls, climbs steps, snaps to ground). Origin is at the feet.
 * `velocity` and `grounded` are state shared by whatever system drives the character.
 */
export const CharacterBody = defineComponent({
  name: 'CharacterBody',
  doc: 'Kinematic capsule character (walls, steps, slopes). Origin at feet.',
  schema: {
    radius: field.number(0.35, { min: 0.05, unit: 'm' }),
    height: field.number(1.8, { min: 0.2, unit: 'm', doc: 'Total height including caps' }),
    stepHeight: field.number(0.5, { min: 0, unit: 'm', doc: 'Max step climbed automatically' }),
    maxSlope: field.number(50, { min: 0, max: 89, unit: 'deg' }),
    snap: field.number(0.3, { min: 0, unit: 'm', doc: 'Snap-to-ground distance when walking down' }),
    layer: field.enum(LAYER_NAMES, 'player'),
    pushProps: field.bool(true, { doc: 'Shove dynamic bodies when walking into them' }),
    velocity: field.vec3(0, { doc: 'State: velocity in m/s, owned by the driving system', unit: 'm/s' }),
    grounded: field.bool(false, { doc: 'Output: standing on ground after the last move' }),
  },
});
