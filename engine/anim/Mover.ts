import { z } from 'zod';
import { defineComponent } from '../core/defineComponent.ts';
import { field } from '../schema/field.ts';
import { EASING_NAMES } from './easing.ts';

const point = z.tuple([z.number(), z.number(), z.number()]);

/**
 * Moves an entity along waypoints relative to where it spawned (platforms, doors, elevators).
 * Signals: "start", "stop", "toggle", "open"/"forward" (go to last point), "close"/"back" (first).
 * `delta` is last tick's displacement so riders (characters) can be carried.
 */
export const Mover = defineComponent({
  name: 'Mover',
  doc: 'Waypoint motion (platforms, doors, elevators) controlled by signals; carries riders.',
  schema: {
    points: field.list(
      point,
      [
        [0, 0, 0],
        [0, 3, 0],
      ],
      { doc: 'Offsets from the spawn position, in meters' },
    ),
    speed: field.number(2, { min: 0.01, unit: 'm/s' }),
    wait: field.number(1, { min: 0, unit: 's', doc: 'Pause at each point' }),
    mode: field.enum(['pingpong', 'loop', 'once'], 'pingpong'),
    ease: field.enum(EASING_NAMES, 'smooth'),
    active: field.bool(true, { doc: 'Moving now' }),
    at: field.int(0, { doc: 'State: index of the last point reached' }),
    to: field.int(-1, { doc: 'State: index being moved toward (-1 = not moving)' }),
    dir: field.int(1, { doc: 'State: pingpong direction through points (+1 / -1)' }),
    goal: field.int(-1, { doc: 'State: stop on reaching this index (-1 = follow mode)' }),
    t: field.number(0, { doc: 'State: progress along the current segment 0..1' }),
    waitLeft: field.number(0, { doc: 'State: seconds left to wait' }),
    origin: field.vec3(0, { doc: 'State: spawn position (captured on first tick)' }),
    started: field.bool(false, { doc: 'State: origin captured' }),
    delta: field.vec3(0, { doc: 'Output: displacement during the last tick' }),
  },
});
