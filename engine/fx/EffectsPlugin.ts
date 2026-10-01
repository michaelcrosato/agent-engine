import { PointLight } from 'three';
import { definePlugin } from '../core/definePlugin.ts';
import { EffectKind } from './Effect.ts';
import { EffectSpawned } from './effectEvents.ts';
import { FxKey, FxSystem } from './FxSystem.ts';
import { ParticlePool } from './ParticlePool.ts';

/** Particle bursts, tracers, and flash lights from data/effects. Use spawnEffect(ctx, id, pos). */
export const EffectsPlugin = definePlugin({
  name: 'effects',
  doc: 'Visual effects (data/effects): spawnEffect(ctx, id, pos, { normal, to }).',
  systems: [FxSystem],
  events: [EffectSpawned],
  contentKinds: [EffectKind],
  setup(engine) {
    if (engine.mode !== 'browser') return;
    engine.provide(FxKey, {
      glow: new ParticlePool(4096, true),
      solid: new ParticlePool(2048, false),
      lights: Array.from({ length: 4 }, () => {
        const l = new PointLight('#ffffff', 0, 6, 2);
        return { light: l, left: 0, total: 1, peak: 0 };
      }),
      nextLight: 0,
    });
  },
});
