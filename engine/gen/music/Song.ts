import { z } from 'zod';
import { defineContentKind } from '../../content/defineContentKind.ts';
import { SoundPatchSchema } from '../sound/SoundPatch.ts';
import { KEYS, SCALE_NAMES } from './theory.ts';

export const TrackSchema = z
  .object({
    instrument: z.string().meta({ description: 'Key in "instruments"' }),
    gain: z.number().min(0).max(4).default(1),
    pan: z.number().min(-1).max(1).default(0),
    octave: z.number().int().min(0).max(8).default(3).meta({ description: 'Octave of chord-relative notes' }),
    pattern: z
      .string()
      .optional()
      .meta({ description: 'Hits per step: "x" hit, "X" accent, "." rest. Cycles.' }),
    notes: z
      .string()
      .optional()
      .meta({
        description:
          'Space-separated steps. 1 3 5 7 = chord tones, 2 4 6 = scale steps, 8 = root up an octave; ' +
          'suffix \' = octave up, , = octave down; note names like C4 also work; "-" holds, "." rests. Cycles.',
      }),
    chord: z
      .string()
      .optional()
      .meta({ description: 'Like pattern, but each hit plays the whole bar chord' }),
    generate: z
      .object({
        seed: z.number().int().default(1),
        density: z.number().min(0).max(1).default(0.4).meta({ description: 'Chance of a note per step' }),
        range: z
          .number()
          .int()
          .min(1)
          .max(15)
          .default(7)
          .meta({ description: 'Chord-relative steps above the root' }),
        length: z
          .number()
          .int()
          .min(1)
          .max(64)
          .default(16)
          .meta({ description: 'Steps before the motif repeats' }),
      })
      .strict()
      .optional()
      .meta({ description: 'Procedural melody that follows the chords' }),
    gate: z
      .number()
      .min(0.05)
      .max(4)
      .default(0.9)
      .meta({ description: 'Note length as a fraction of its steps' }),
    bars: z
      .array(z.number().int())
      .default([])
      .meta({ description: 'Bars (0-based) this track plays; empty = all' }),
  })
  .strict();

export const SongSchema = z
  .object({
    doc: z.string().default(''),
    bpm: z.number().min(30).max(300).default(110),
    bars: z.number().int().min(1).max(128).default(8),
    beatsPerBar: z.number().int().min(1).max(16).default(4),
    stepsPerBar: z.number().int().min(1).max(64).default(16),
    swing: z
      .number()
      .min(0)
      .max(0.5)
      .default(0)
      .meta({ description: 'Delay of off-beat steps (fraction of a step)' }),
    key: z.enum(KEYS).default('A'),
    scale: z.enum(SCALE_NAMES as [string, ...string[]]).default('minor'),
    chords: z
      .array(z.string())
      .default(['i'])
      .meta({ description: 'Roman numerals per bar, cycled: ["i","VI","III","VII"]' }),
    instruments: z.record(z.string(), z.union([z.string(), SoundPatchSchema])).meta({
      description: 'Name → sound id or inline patch. Pitched instruments are tuned so freq 440 = the note.',
    }),
    tracks: z.array(TrackSchema).min(1),
    gain: z.number().min(0).max(4).default(0.7),
    reverb: z.number().min(0).max(1).default(0.15),
  })
  .strict();

export type Song = z.output<typeof SongSchema>;
export type SongTrack = z.output<typeof TrackSchema>;

/** Procedural music: data/music/<id>.json. A looping step-sequencer song rendered from patches. */
export const MusicKind = defineContentKind({
  name: 'music',
  folder: 'music',
  doc: 'Looping song: tempo, key, chord progression, and step-sequenced tracks of synth instruments.',
  schema: SongSchema,
});
