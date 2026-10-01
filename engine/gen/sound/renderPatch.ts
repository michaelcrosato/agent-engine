import { applyFx, fxTail } from './effects.ts';
import { layerLength, renderLayer } from './renderLayer.ts';
import type { SoundPatch } from './SoundPatch.ts';

export const SAMPLE_RATE = 44100;

export type PatchRenderOpts = {
  sampleRate?: number;
  /** Frequency multiplier (music: noteHz / 440; random variation at play time). */
  pitch?: number;
  /** Note-on seconds for instruments (overrides sustainTime). */
  gate?: number;
  seed?: number;
};

/** Seconds a patch lasts (longest layer plus fx tail). */
export function patchLength(p: SoundPatch, gate?: number): number {
  return Math.max(...p.layers.map((l) => layerLength(l, gate))) + fxTail(p.fx);
}

/** Synthesizes a patch to a mono Float32Array at `sampleRate` (default 44100). Pure. */
export function renderPatch(p: SoundPatch, opts: PatchRenderOpts = {}): Float32Array {
  const sr = opts.sampleRate ?? SAMPLE_RATE;
  const out = new Float32Array(Math.max(1, Math.ceil(patchLength(p, opts.gate) * sr)));
  p.layers.forEach((l, k) => {
    renderLayer(l, out, {
      sampleRate: sr,
      pitch: opts.pitch ?? 1,
      gate: opts.gate,
      seed: (opts.seed ?? 1) * 31 + k,
    });
  });
  applyFx(out, p.fx, sr);
  let peak = 0;
  for (let i = 0; i < out.length; i++) {
    out[i] = out[i]! * p.gain;
    peak = Math.max(peak, Math.abs(out[i]!));
  }
  if (peak > 1) for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i]!);
  return out;
}
