import { Rng } from '../../core/Rng.ts';
import { Biquad } from './Biquad.ts';
import { envelopeAt, envelopeLength } from './envelope.ts';
import type { SoundLayer } from './SoundPatch.ts';

export type LayerRenderOpts = {
  sampleRate: number;
  /** Multiplies every frequency (music notes: noteHz / 440). */
  pitch: number;
  /** Note-on seconds (instruments); undefined for one-shots. */
  gate?: number;
  seed: number;
};

/** Seconds this layer lasts, including its start delay. */
export function layerLength(l: SoundLayer, gate?: number): number {
  return l.delay + envelopeLength(l.env, gate);
}

const TAU = Math.PI * 2;

/** Renders one layer, adding into `out` (mono) starting at sample 0. */
export function renderLayer(l: SoundLayer, out: Float32Array, o: LayerRenderOpts): void {
  const sr = o.sampleRate;
  const start = Math.floor(l.delay * sr);
  const len = Math.min(out.length - start, Math.ceil(envelopeLength(l.env, o.gate) * sr));
  if (len <= 0) return;
  const rng = new Rng(o.seed);
  const detune = 2 ** (l.detune / 1200);
  const f0 = l.freq * o.pitch * detune;
  const f1 = (l.freqEnd ?? l.freq) * o.pitch * detune;
  const glide = l.glide > 0 ? l.glide : len / sr;
  const filter = l.filter ? new Biquad(l.filter.type, sr) : undefined;
  let phase = 0;
  let modPhase = 0;
  let pink = [0, 0, 0];
  let brown = 0;
  let ks: Float32Array | undefined;
  let ksIdx = 0;
  if (l.wave === 'pluck') {
    ks = new Float32Array(Math.max(2, Math.round(sr / f0)));
    for (let i = 0; i < ks.length; i++) ks[i] = rng.next() * 2 - 1;
  }
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const g = Math.min(1, t / glide);
    let f = f1 === f0 ? f0 : f0 * (f1 / f0) ** g;
    if (l.vibratoDepth > 0) f *= 2 ** ((Math.sin(TAU * l.vibratoRate * t) * l.vibratoDepth) / 12);
    phase += f / sr;
    phase -= Math.floor(phase);
    let s: number;
    switch (l.wave) {
      case 'square':
        s = phase < l.duty ? 1 : -1;
        break;
      case 'saw':
        s = 2 * phase - 1;
        break;
      case 'triangle':
        s = 4 * Math.abs(phase - 0.5) - 1;
        break;
      case 'noise':
        s = rng.next() * 2 - 1;
        break;
      case 'pink': {
        const w = rng.next() * 2 - 1;
        pink = [
          0.99765 * pink[0]! + w * 0.099046,
          0.963 * pink[1]! + w * 0.2965164,
          0.57 * pink[2]! + w * 1.0526913,
        ];
        s = (pink[0]! + pink[1]! + pink[2]! + w * 0.1848) * 0.2;
        break;
      }
      case 'brown':
        brown = (brown + (rng.next() * 2 - 1) * 0.02) / 1.02;
        s = brown * 3.5;
        break;
      case 'fm': {
        modPhase += (f * l.fmRatio) / sr;
        const idx = l.fmIndex + ((l.fmIndexEnd ?? l.fmIndex) - l.fmIndex) * (i / len);
        s = Math.sin(TAU * phase + idx * Math.sin(TAU * modPhase));
        break;
      }
      case 'pluck': {
        const buf = ks!;
        const j = ksIdx % buf.length;
        const next = (j + 1) % buf.length;
        s = buf[j]!;
        buf[j] = (buf[j]! + buf[next]!) * 0.498;
        ksIdx++;
        break;
      }
      default:
        s = Math.sin(TAU * phase);
    }
    if (filter && l.filter) {
      if ((i & 31) === 0) {
        const fc =
          l.filter.freqEnd !== undefined
            ? l.filter.freq * (l.filter.freqEnd / l.filter.freq) ** (i / len)
            : l.filter.freq;
        filter.set(fc, l.filter.q);
      }
      s = filter.process(s);
    }
    let amp = envelopeAt(l.env, t, o.gate) * l.gain;
    if (l.tremoloDepth > 0) amp *= 1 - l.tremoloDepth * (0.5 + 0.5 * Math.sin(TAU * l.tremoloRate * t));
    out[start + i] = out[start + i]! + s * amp;
  }
}
