import { Rng } from '../../core/Rng.ts';
import type { SongTrack } from './Song.ts';
import { type Chord, chordToneOffset, noteToMidi } from './theory.ts';

/** One note-on: when, how long, which MIDI notes (null = unpitched hit), and how loud. */
export type NoteEvent = { step: number; steps: number; midi: number[] | null; velocity: number };

export type SongContext = {
  totalSteps: number;
  stepsPerBar: number;
  tonic: number;
  scale: readonly number[];
  chordAt: (bar: number) => Chord;
};

function holdLength(cells: readonly string[], i: number, total: number): number {
  let n = 1;
  while (n < total && cells[(i + n) % cells.length] === '-') n++;
  return n;
}

function chordRelativeMidi(
  token: string,
  octave: number,
  chord: Chord,
  ctx: SongContext,
): number | undefined {
  const named = noteToMidi(token);
  if (named !== undefined) return named;
  const m = /^(\d+)(['’,]*)$/.exec(token);
  if (!m) return undefined;
  const shift = (m[2]!.match(/['’]/g)?.length ?? 0) - (m[2]!.match(/,/g)?.length ?? 0);
  return 12 * (octave + 1) + ctx.tonic + chordToneOffset(Number(m[1]), chord, ctx.scale) + 12 * shift;
}

/** Expands a track (pattern / chord / notes / generate) into note events over the whole song. */
export function songEvents(t: SongTrack, ctx: SongContext): NoteEvent[] {
  const out: NoteEvent[] = [];
  const playsBar = (bar: number) => !t.bars.length || t.bars.includes(bar);
  const hits = t.pattern ?? t.chord;
  if (hits !== undefined) {
    const cells = [...hits.replace(/\s+/g, '')];
    for (let s = 0; s < ctx.totalSteps; s++) {
      const c = cells[s % cells.length];
      const bar = Math.floor(s / ctx.stepsPerBar);
      if (!c || c === '.' || c === '-' || !playsBar(bar)) continue;
      const velocity = c === 'X' ? 1 : /\d/.test(c) ? Number(c) / 9 : 0.75;
      const steps = holdLength(cells, s % cells.length, ctx.totalSteps);
      const chord = ctx.chordAt(bar);
      const midi = t.chord !== undefined ? chord.tones.map((o) => 12 * (t.octave + 1) + ctx.tonic + o) : null;
      out.push({ step: s, steps, midi, velocity });
    }
    return out;
  }
  if (t.notes !== undefined) {
    const cells = t.notes.trim().split(/\s+/);
    for (let s = 0; s < ctx.totalSteps; s++) {
      const tok = cells[s % cells.length]!;
      const bar = Math.floor(s / ctx.stepsPerBar);
      if (tok === '.' || tok === '-' || !playsBar(bar)) continue;
      const midi = chordRelativeMidi(tok, t.octave, ctx.chordAt(bar), ctx);
      if (midi === undefined) continue;
      out.push({
        step: s,
        steps: holdLength(cells, s % cells.length, ctx.totalSteps),
        midi: [midi],
        velocity: 0.8,
      });
    }
    return out;
  }
  if (t.generate) {
    const g = t.generate;
    const rng = new Rng(g.seed);
    const motif: (number | null)[] = [];
    let cur = 1;
    for (let k = 0; k < g.length; k++) {
      const strong = k % 4 === 0 ? 1.5 : k % 2 === 0 ? 1 : 0.6;
      if (!rng.chance(Math.min(1, g.density * strong))) {
        motif.push(null);
        continue;
      }
      cur = Math.min(g.range + 1, Math.max(1, cur + rng.int(-2, 2)));
      if (k % 4 === 0 && ![1, 3, 5, 8].includes(cur)) cur = rng.pick([1, 3, 5]);
      motif.push(cur);
    }
    for (let s = 0; s < ctx.totalSteps; s++) {
      const tok = motif[s % motif.length];
      const bar = Math.floor(s / ctx.stepsPerBar);
      if (tok == null || !playsBar(bar)) continue;
      let steps = 1;
      while (steps < 4 && motif[(s + steps) % motif.length] == null) steps++;
      const midi = chordRelativeMidi(String(tok), t.octave, ctx.chordAt(bar), ctx)!;
      out.push({ step: s, steps, midi: [midi], velocity: 0.6 + rng.next() * 0.3 });
    }
  }
  return out;
}
