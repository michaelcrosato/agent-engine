import type { ClipData, ClipTrack } from './Clip.ts';
import { EASINGS } from './easing.ts';

/** Value of one track at time t (seconds, already wrapped for looping clips). */
export function sampleTrack(track: ClipTrack, t: number): number {
  if (track.wave) {
    const w = track.wave;
    return w.offset + w.amp * Math.sin(2 * Math.PI * (w.freq * t + w.phase));
  }
  const keys = track.keys;
  if (!keys.length) return 0;
  if (t <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i]!;
    if (t <= t1) {
      const [t0, v0] = keys[i - 1]!;
      const k = EASINGS[track.ease]((t - t0) / Math.max(1e-6, t1 - t0));
      return v0 + (v1 - v0) * k;
    }
  }
  return keys[keys.length - 1]![1];
}

/** Clip-local time for an elapsed time (loops wrap; one-shots clamp). */
export function clipTime(clip: ClipData, elapsed: number): number {
  return clip.loop
    ? ((elapsed % clip.duration) + clip.duration) % clip.duration
    : Math.min(elapsed, clip.duration);
}

/** All track values of a clip at a time: `{ part, prop, value }[]`. Pure; usable in tests. */
export function sampleClip(
  clip: ClipData,
  elapsed: number,
): { part: string; prop: ClipTrack['prop']; value: number }[] {
  const t = clipTime(clip, elapsed);
  return clip.tracks.map((tr) => ({ part: tr.part, prop: tr.prop, value: sampleTrack(tr, t) }));
}
