# Songs

Music is a step sequencer over synth instruments (`data/music/<id>.json`), rendered to a
seamless loop. Notes are written relative to the chord of each bar, so changing `key`,
`scale`, or `chords` re-harmonizes the whole song.

```json
{
  "doc": "Tense combat loop in D minor: driving drums, saw bass, procedural lead.",
  "bpm": 128, "bars": 8, "key": "D", "scale": "minor", "swing": 0.05,
  "chords": ["i", "VI", "III", "VII"],
  "instruments": { "kick": "inst/kick", "snare": "inst/snare", "hat": "inst/hat",
                   "bass": "inst/bass", "pad": "inst/pad", "lead": "inst/lead" },
  "tracks": [
    { "instrument": "kick", "pattern": "x...x...x..xx..." },
    { "instrument": "snare", "pattern": "....x.......x..x", "bars": [2, 3, 4, 5, 6, 7] },
    { "instrument": "bass", "notes": "1 - . 1 . 1 5, - 1 - . 8 . 5 . 3", "octave": 2 },
    { "instrument": "pad", "chord": "x---------------", "octave": 3, "pan": -0.2 },
    { "instrument": "lead", "generate": { "seed": 4, "density": 0.45, "length": 32 }, "octave": 4 }
  ]
}
```

## Tracks

Each track plays one instrument (a sound id or an inline patch) in one of four ways:

| Field | Meaning |
| --- | --- |
| `pattern` | Drum hits per step: `x` hit, `X` accent, `.` rest. Cycles. |
| `notes` | Space-separated steps. `1 3 5 7` chord tones, `2 4 6` scale steps, `8` root up an octave; `'` octave up, `,` octave down; note names like `C4` work too; `-` holds, `.` rests. |
| `chord` | Like `pattern`, but each hit plays the bar's whole chord. |
| `generate` | A melody that follows the chords: `seed`, `density` (chance of a note per step), `range` (chord-relative steps above the root), `length` (steps before the motif repeats). |

Also per track: `octave`, `gain`, `pan`, `gate` (note length), `bars` (which bars it plays).
Song fields: `bpm`, `bars`, `beatsPerBar`, `stepsPerBar`, `swing`, `key`, `scale` (major,
minor, dorian, phrygian, lydian, mixolydian, harmonicMinor, pentatonic, minorPentatonic,
blues), `chords` (roman numerals, one per bar, cycled), `gain`, `reverb`.

Pitched instruments are tuned so a patch `freq` of 440 plays the written note.

## Listening

```sh
npm run music -- tense    # out/music/tense.wav (seamless loop) + .png spectrogram, timing and loudness stats
```

Rooms set `"music"`; signal specs switch it (`{ "music": "tense" }`, `"none"` for silence),
crossfading in the browser. Tests read `t.engine.audio.currentMusic`.
