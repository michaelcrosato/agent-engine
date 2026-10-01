import type { Envelope } from './SoundPatch.ts';

/** Total length of an envelope in seconds, with `gate` overriding sustainTime when given. */
export function envelopeLength(env: Envelope, gate?: number): number {
  const sustain =
    gate !== undefined ? Math.max(0, gate - env.attack - env.hold - env.decay) : env.sustainTime;
  return env.attack + env.hold + env.decay + sustain + env.release;
}

/** Envelope level (0..1) at time t seconds. `gate` = note-on duration for instruments. */
export function envelopeAt(env: Envelope, t: number, gate?: number): number {
  if (t < 0) return 0;
  const { attack: a, hold: h, decay: d, sustain: s, release: r, curve } = env;
  const sustainTime = gate !== undefined ? Math.max(0, gate - a - h - d) : env.sustainTime;
  if (t < a) return a > 0 ? t / a : 1;
  let x = t - a;
  if (x < h) return 1;
  x -= h;
  if (x < d) return s + (1 - s) * (1 - x / d) ** curve;
  x -= d;
  if (x < sustainTime) return s;
  x -= sustainTime;
  const startLevel = d > 0 || sustainTime > 0 ? s : 1;
  if (x < r) return startLevel * (1 - x / r) ** curve;
  return 0;
}
