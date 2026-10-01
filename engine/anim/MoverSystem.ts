import { Vector3 } from 'three';
import type { ComponentData } from '../core/defineComponent.ts';
import { defineSystem } from '../core/defineSystem.ts';
import { Transform } from '../core/Transform.ts';
import { Signal } from '../logic/Signal.ts';
import { EASINGS } from './easing.ts';
import { Mover } from './Mover.ts';

type M = ComponentData<typeof Mover>;

const from = new Vector3();
const to = new Vector3();
const before = new Vector3();

/** The point to head for after reaching `m.at`, or undefined to stop. */
function nextIndex(m: M, n: number): number | undefined {
  if (m.goal >= 0) return m.at === m.goal ? undefined : m.at + Math.sign(m.goal - m.at);
  if (m.mode === 'loop') return (m.at + 1) % n;
  const next = m.at + m.dir;
  if (next >= 0 && next < n) return next;
  if (m.mode === 'once') return undefined;
  m.dir = -m.dir;
  return m.at + m.dir;
}

/** Heads for point `goal` and stops there; reverses mid-segment if moving away from it. */
function setGoal(m: M, goal: number): void {
  if (m.to >= 0 && Math.sign(goal - m.to) === -Math.sign(m.to - m.at)) {
    [m.at, m.to] = [m.to, m.at];
    m.t = 1 - m.t;
  }
  m.goal = goal;
  m.active = true;
  m.waitLeft = 0;
}

function handle(m: M, action: string): void {
  if (action === 'start') m.active = true;
  else if (action === 'stop') m.active = false;
  else if (action === 'toggle') m.active = !m.active;
  else if (action === 'open' || action === 'forward') setGoal(m, m.points.length - 1);
  else if (action === 'close' || action === 'back') setGoal(m, 0);
}

/** Advances Mover components along their waypoints and records per-tick displacement. */
export const MoverSystem = defineSystem({
  name: 'MoverSystem',
  doc: 'Moves Mover entities between waypoints; reacts to open/close/start/stop/toggle signals.',
  phase: 'update',
  run(ctx) {
    const signals = ctx.events.read(Signal);
    for (const e of ctx.world.query(Mover, Transform)) {
      const m = ctx.world.get(e, Mover)!;
      const t = ctx.world.get(e, Transform)!;
      if (!m.started) {
        m.origin.copy(t.pos);
        m.started = true;
      }
      for (const s of signals) if (s.target === e) handle(m, s.action);
      m.delta.set(0, 0, 0);
      const n = m.points.length;
      if (!m.active || n < 2) continue;
      if (m.waitLeft > 0) {
        m.waitLeft -= ctx.time.dt;
        continue;
      }
      if (m.to < 0) {
        const next = nextIndex(m, n);
        if (next === undefined) {
          m.active = false;
          m.goal = -1;
          continue;
        }
        m.to = next;
        m.t = 0;
      }
      const a = m.points[m.at]!;
      const b = m.points[m.to]!;
      from.set(a[0], a[1], a[2]);
      to.set(b[0], b[1], b[2]);
      m.t = Math.min(1, m.t + (m.speed * ctx.time.dt) / Math.max(1e-4, from.distanceTo(to)));
      before.copy(t.pos);
      t.pos.copy(from.lerp(to, EASINGS[m.ease](m.t))).add(m.origin);
      m.delta.subVectors(t.pos, before);
      if (m.t < 1) continue;
      m.at = m.to;
      m.to = -1;
      m.t = 0;
      m.waitLeft = m.wait;
      if (m.goal === m.at) {
        m.goal = -1;
        m.active = false;
      }
    }
  },
});
