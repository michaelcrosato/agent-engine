import type { SoundPatch } from './SoundPatch.ts';

type Fx = SoundPatch['fx'];

function reverb(buf: Float32Array, sr: number, room: number, mix: number): void {
  const combs = [1557, 1617, 1491, 1422].map((n) => new Float32Array(Math.floor((n * sr) / 44100)));
  const aps = [225, 556].map((n) => new Float32Array(Math.floor((n * sr) / 44100)));
  const idx = [0, 0, 0, 0];
  const apIdx = [0, 0];
  const fb = 0.7 + room * 0.25;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i]!;
    let y = 0;
    combs.forEach((c, k) => {
      const v = c[idx[k]!]!;
      c[idx[k]!] = x + v * fb;
      idx[k] = (idx[k]! + 1) % c.length;
      y += v;
    });
    y *= 0.25;
    aps.forEach((a, k) => {
      const v = a[apIdx[k]!]!;
      a[apIdx[k]!] = y + v * 0.5;
      apIdx[k] = (apIdx[k]! + 1) % a.length;
      y = v - y * 0.5;
    });
    buf[i] = x * (1 - mix * 0.5) + y * mix;
  }
}

/** Applies drive, crush, echo, and reverb in place. Mono buffer. */
export function applyFx(buf: Float32Array, fx: Fx, sr: number): void {
  if (fx.drive > 0) {
    const k = 1 + fx.drive * 20;
    const norm = Math.tanh(k);
    for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i]! * k) / norm;
  }
  if (fx.crush > 0) {
    const levels = 2 ** Math.max(2, Math.round(16 - fx.crush * 13));
    const hold = 1 + Math.floor(fx.crush * 12);
    let held = 0;
    for (let i = 0; i < buf.length; i++) {
      if (i % hold === 0) held = Math.round(buf[i]! * levels) / levels;
      buf[i] = held;
    }
  }
  if (fx.echoMix > 0 && fx.echoTime > 0) {
    const d = Math.floor(fx.echoTime * sr);
    for (let i = d; i < buf.length; i++) buf[i] = buf[i]! + buf[i - d]! * fx.echoFeedback * fx.echoMix * 2;
  }
  if (fx.reverb > 0) reverb(buf, sr, fx.room, fx.reverb);
}

/** Extra tail seconds the fx need (echo repeats, reverb decay). */
export function fxTail(fx: Fx): number {
  let t = 0;
  if (fx.echoMix > 0) t = Math.max(t, fx.echoTime * 6);
  if (fx.reverb > 0) t = Math.max(t, 0.6 + fx.room * 2);
  return t;
}
