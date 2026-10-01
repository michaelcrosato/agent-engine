import type { Vector3 } from 'three';
import { defineEvent } from '../core/defineEvent.ts';

export const EffectSpawned = defineEvent<{
  effect: string;
  pos: Vector3;
  normal: Vector3 | undefined;
  to: Vector3 | undefined;
}>(
  'EffectSpawned',
  'A visual effect was requested at a position (rendered in the browser, recorded headless).',
);
