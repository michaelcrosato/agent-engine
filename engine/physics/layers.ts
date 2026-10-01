/**
 * Collision layers. Each collider belongs to one layer; the table says which layers it
 * touches. Interaction requires both sides to list each other (Rapier interaction groups).
 */
export const LAYER_NAMES = [
  'world',
  'prop',
  'player',
  'enemy',
  'pickup',
  'trigger',
  'debris',
  'projectile',
] as const;

export type Layer = (typeof LAYER_NAMES)[number];

const BIT: Record<Layer, number> = {
  world: 1,
  prop: 2,
  player: 4,
  enemy: 8,
  pickup: 16,
  trigger: 32,
  debris: 64,
  projectile: 128,
};

const ALL = 0xffff;

const TOUCHES: Record<Layer, readonly Layer[] | 'all'> = {
  world: 'all',
  prop: 'all',
  player: ['world', 'prop', 'enemy', 'pickup', 'trigger', 'projectile'],
  enemy: ['world', 'prop', 'player', 'enemy', 'trigger', 'projectile'],
  pickup: ['world', 'prop', 'player'],
  trigger: ['world', 'prop', 'player', 'enemy'],
  debris: ['world', 'prop', 'debris'],
  projectile: ['world', 'prop', 'player', 'enemy'],
};

export function layerMask(layers: readonly Layer[]): number {
  return layers.reduce((m, l) => m | BIT[l], 0);
}

/** Rapier interaction groups for a collider on `layer`: membership << 16 | filter. */
export function layerGroups(layer: Layer): number {
  const t = TOUCHES[layer];
  const filter = t === 'all' ? ALL : layerMask(t);
  return ((BIT[layer] << 16) | filter) >>> 0;
}

/** Interaction groups for a scene query that should hit `layers` (default: everything). */
export function queryGroups(layers?: readonly Layer[]): number {
  return ((ALL << 16) | (layers ? layerMask(layers) : ALL)) >>> 0;
}
