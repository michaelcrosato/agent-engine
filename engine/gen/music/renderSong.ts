import { EngineError } from '../../core/EngineError.ts';
import { applyFx } from '../sound/effects.ts';
import { renderPatch, SAMPLE_RATE } from '../sound/renderPatch.ts';
import { type SoundPatch, SoundPatchSchema } from '../sound/SoundPatch.ts';
import type { Song } from './Song.ts';
import { songEvents } from './songEvents.ts';
import { midiToHz, parseChord, pitchClass, SCALES, type ScaleName } from './theory.ts';

export type RenderedSong = {
  sampleRate: number;
  left: Float32Array;
  right: Float32Array;
  seconds: number;
  notes: number;
};

/** Seconds one loop of the song lasts. */
export function songLength(song: Song): number {
  return (song.bars * song.beatsPerBar * 60) / song.bpm;
}

/**
 * Renders a song to a seamless stereo loop: every note is synthesized from its instrument patch,
 * tails that run past the end wrap to the start. `sound(id)` resolves instrument sound ids.
 */
export function renderSong(
  song: Song,
  sound: (id: string) => SoundPatch,
  sampleRate = SAMPLE_RATE,
): RenderedSong {
  const scale = SCALES[song.scale as ScaleName];
  const chords = song.chords.map((c, i) => {
    const ch = parseChord(c, scale);
    if (ch) return ch;
    throw new EngineError({
      code: 'SONG_CHORD_INVALID',
      what: `Chord "${c}" is not a roman numeral`,
      where: { path: `$.chords[${i}]` },
      fix: 'Use i, ii, iii, iv, v, vi, vii (case is cosmetic), optionally with 7: "V7".',
    });
  });
  const stepSec = (60 / song.bpm) * (song.beatsPerBar / song.stepsPerBar);
  const totalSteps = song.bars * song.stepsPerBar;
  const total = Math.round(totalSteps * stepSec * sampleRate);
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  const cache = new Map<string, Float32Array>();
  const ctx = {
    totalSteps,
    stepsPerBar: song.stepsPerBar,
    tonic: pitchClass(song.key),
    scale,
    chordAt: (bar: number) => chords[bar % chords.length]!,
  };
  let notes = 0;
  song.tracks.forEach((track, ti) => {
    const ref = song.instruments[track.instrument];
    if (ref === undefined) {
      throw new EngineError({
        code: 'SONG_INSTRUMENT_MISSING',
        what: `Track ${ti} uses instrument "${track.instrument}", which is not in "instruments"`,
        where: { path: `$.tracks[${ti}].instrument` },
        fix: `Add "${track.instrument}": "<sound id>" to instruments. Known: ${Object.keys(song.instruments).join(', ')}`,
      });
    }
    const patch = typeof ref === 'string' ? sound(ref) : SoundPatchSchema.parse(ref);
    const panL = Math.cos(((track.pan + 1) * Math.PI) / 4);
    const panR = Math.sin(((track.pan + 1) * Math.PI) / 4);
    for (const ev of songEvents(track, ctx)) {
      const swing = ev.step % 2 === 1 ? song.swing : 0;
      const start = Math.round((ev.step + swing) * stepSec * sampleRate);
      const gate = ev.steps * stepSec * track.gate;
      for (const midi of ev.midi ?? [null]) {
        const pitch = midi === null ? 1 : midiToHz(midi) / 440;
        const key = `${ti}|${pitch.toFixed(5)}|${ev.midi ? gate.toFixed(3) : ''}`;
        let buf = cache.get(key);
        if (!buf)
          cache.set(key, (buf = renderPatch(patch, { pitch, ...(ev.midi ? { gate } : {}), sampleRate })));
        const g = ev.velocity * track.gain;
        for (let i = 0; i < buf.length; i++) {
          const j = (start + i) % total;
          left[j] = left[j]! + buf[i]! * g * panL;
          right[j] = right[j]! + buf[i]! * g * panR;
        }
        notes++;
      }
    }
  });
  for (const ch of [left, right]) {
    if (song.reverb > 0) {
      const twice = new Float32Array(total * 2);
      twice.set(ch);
      twice.set(ch, total);
      applyFx(
        twice,
        { drive: 0, crush: 0, echoTime: 0, echoFeedback: 0, echoMix: 0, reverb: song.reverb, room: 0.6 },
        sampleRate,
      );
      ch.set(twice.subarray(total));
    }
    for (let i = 0; i < total; i++) ch[i] = Math.tanh(ch[i]! * song.gain);
  }
  return { sampleRate, left, right, seconds: total / sampleRate, notes };
}
