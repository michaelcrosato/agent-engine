import { Color, type PointLight, Vector3 } from 'three';
import { defineService } from '../core/defineService.ts';
import { defineSystem } from '../core/defineSystem.ts';
import { RendererKey } from '../render/Renderer.ts';
import { type Effect, EffectKind } from './Effect.ts';
import { EffectSpawned } from './effectEvents.ts';
import type { ParticlePool } from './ParticlePool.ts';

/** Browser-side effect renderer state: particle pools and flash lights. */
export type FxState = {
  glow: ParticlePool;
  solid: ParticlePool;
  lights: { light: PointLight; left: number; total: number; peak: number }[];
  nextLight: number;
};

export const FxKey = defineService<FxState>('fx', 'Particle pools and flash lights (browser only).');

const c0 = new Color();
const c1 = new Color();
const dir = new Vector3();
const tmp = new Vector3();

function emit(
  fx: FxState,
  d: Effect,
  pos: Vector3,
  normal: Vector3 | undefined,
  to: Vector3 | undefined,
): void {
  const pool = d.glow ? fx.glow : fx.solid;
  c0.set(d.color);
  c1.set(d.colorEnd);
  const r = (a: [number, number]) => a[0] + Math.random() * (a[1] - a[0]);
  for (let k = 0; k < d.count; k++) {
    const i = pool.alloc();
    if (d.type === 'tracer' && to) {
      tmp.lerpVectors(pos, to, k / Math.max(1, d.count - 1));
      dir.set(0, 0, 0);
    } else {
      dir.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      if (normal && d.spread < 180) {
        const n = normal.clone().normalize();
        dir.lerp(n, 1 - d.spread / 180).normalize();
        if (dir.dot(n) < 0) dir.reflect(n);
      }
      tmp.copy(pos).addScaledVector(dir, Math.random() * d.radius);
      dir.multiplyScalar(r(d.speed));
    }
    pool.pos.set([tmp.x, tmp.y, tmp.z], i * 3);
    pool.vel.set([dir.x, dir.y, dir.z], i * 3);
    pool.maxLife[i] = pool.life[i] = r(d.lifetime);
    pool.size0[i] = r(d.size);
    pool.sizeEnd[i] = d.sizeEnd;
    pool.c0.set([c0.r, c0.g, c0.b], i * 3);
    pool.c1.set([c1.r, c1.g, c1.b], i * 3);
    pool.grav[i] = d.gravity;
    pool.drag[i] = d.drag;
  }
  if (d.light && fx.lights.length) {
    const slot = fx.lights[fx.nextLight++ % fx.lights.length]!;
    slot.light.position.copy(pos);
    slot.light.color.set(d.light.color);
    slot.light.distance = d.light.range;
    slot.left = slot.total = Math.max(0.01, d.light.seconds);
    slot.peak = d.light.intensity;
  }
}

/** Spawns particles for EffectSpawned events and animates them (browser only, frame phase). */
export const FxSystem = defineSystem({
  name: 'FxSystem',
  doc: 'Renders effect bursts, tracers, and flash lights from EffectSpawned events.',
  phase: 'frame',
  run(ctx) {
    const fx = ctx.engine.tryService(FxKey);
    const events = ctx.events.read(EffectSpawned);
    if (!fx) return;
    const r = ctx.service(RendererKey);
    if (!fx.glow.points.parent)
      r.scene.add(fx.glow.points, fx.solid.points, ...fx.lights.map((l) => l.light));
    for (const ev of events) emit(fx, ctx.content.get(EffectKind, ev.effect), ev.pos, ev.normal, ev.to);
    const dt = ctx.time.frameDt;
    fx.glow.update(dt);
    fx.solid.update(dt);
    for (const l of fx.lights) {
      l.left = Math.max(0, l.left - dt);
      l.light.intensity = l.peak * (l.left / Math.max(1e-3, l.total));
    }
  },
});
