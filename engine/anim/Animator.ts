import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';

/**
 * Plays animation clips on the entity's puppet. `play` is a clip id or a role from the
 * puppet's `clips` map ("idle", "walk", "attack"). Changing `play` crossfades over `fade`.
 */
export const Animator = defineComponent({
  name: 'Animator',
  doc: 'Plays clips (by id or puppet role) on the Model puppet, with crossfades.',
  schema: {
    play: field.string('idle', { doc: 'Clip id or puppet clip role' }),
    speed: field.number(1, { min: 0, doc: 'Playback rate' }),
    fade: field.number(0.2, { min: 0, unit: 's', doc: 'Crossfade time when play changes' }),
    time: field.number(0, { doc: 'State: seconds into the current clip' }),
    current: field.string('', { doc: 'State: clip id now playing' }),
    prev: field.string('', { doc: 'State: clip id fading out' }),
    prevTime: field.number(0, { doc: 'State: seconds into the fading clip' }),
    blend: field.number(1, { doc: 'State: weight of the current clip (0..1)' }),
  },
});
