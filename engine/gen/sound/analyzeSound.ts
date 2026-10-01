import { spectrum } from './fft.ts';

export type SoundAnalysis = {
  seconds: number;
  /** Seconds until the level stays below -50 dB of peak. */
  audibleSeconds: number;
  peakDb: number;
  rmsDb: number;
  /** Seconds from start to 90% of peak level. */
  attackSeconds: number;
  /** Energy-weighted mean frequency in Hz (brightness). */
  centroidHz: number;
  /** Strongest frequency in Hz over the loudest frame (pitch estimate for tonal sounds). */
  dominantHz: number;
  /** Plain-words summary, e.g. "short, percussive, bright". */
  character: string;
};

const db = (x: number): number => (x > 0 ? 20 * Math.log10(x) : -120);

/** Numbers and words describing a rendered sound, so agents can reason about audio without ears. */
export function analyzeSound(s: Float32Array, sampleRate: number): SoundAnalysis {
  let peak = 0;
  let sum = 0;
  for (const x of s) {
    const a = Math.abs(x);
    if (a > peak) peak = a;
    sum += x * x;
  }
  const rms = Math.sqrt(sum / Math.max(1, s.length));
  const floor = peak * 10 ** (-50 / 20);
  let last = 0;
  let attack = -1;
  for (let i = 0; i < s.length; i++) {
    const a = Math.abs(s[i]!);
    if (a > floor) last = i;
    if (attack < 0 && a >= peak * 0.9) attack = i;
  }
  const n = 2048;
  let best = 0;
  let bestEnergy = -1;
  for (let off = 0; off < Math.max(1, s.length - n); off += n / 2) {
    let e = 0;
    for (let i = off; i < Math.min(s.length, off + n); i++) e += s[i]! * s[i]!;
    if (e > bestEnergy) {
      bestEnergy = e;
      best = off;
    }
  }
  const mag = spectrum(s, best, n);
  let num = 0;
  let den = 0;
  let maxBin = 1;
  for (let i = 1; i < mag.length; i++) {
    const f = (i * sampleRate) / n;
    num += f * mag[i]!;
    den += mag[i]!;
    if (mag[i]! > mag[maxBin]!) maxBin = i;
  }
  const centroid = den > 0 ? num / den : 0;
  const audible = last / sampleRate;
  const atk = Math.max(0, attack) / sampleRate;
  const words = [
    audible < 0.25 ? 'short' : audible < 1 ? 'medium' : 'long',
    atk < 0.01 ? 'percussive' : atk < 0.08 ? 'quick attack' : 'soft attack',
    centroid < 400 ? 'deep' : centroid < 1500 ? 'warm' : centroid < 4000 ? 'bright' : 'harsh/hissy',
    db(peak) > -1 ? 'near clipping' : db(peak) < -24 ? 'quiet' : '',
  ].filter(Boolean);
  const round = (x: number, p = 3) => Math.round(x * 10 ** p) / 10 ** p;
  return {
    seconds: round(s.length / sampleRate),
    audibleSeconds: round(audible),
    peakDb: round(db(peak), 1),
    rmsDb: round(db(rms), 1),
    attackSeconds: round(atk),
    centroidHz: Math.round(centroid),
    dominantHz: Math.round((maxBin * sampleRate) / n),
    character: words.join(', '),
  };
}
