/** Music theory helpers: note names, scales, and roman-numeral chords. */

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  pentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
} as const;

export type ScaleName = keyof typeof SCALES;
export const SCALE_NAMES = Object.keys(SCALES) as ScaleName[];
export const KEYS = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
] as const;

/** Pitch class (0-11) of a key name like "F#" or "Bb". */
export function pitchClass(key: string): number {
  const base = NOTE_INDEX[key[0]!.toUpperCase()] ?? 0;
  const rest = key.slice(1);
  const sharps = rest.split('#').length - 1;
  const flats = rest.split('b').length - 1;
  return (((base + sharps - flats) % 12) + 12) % 12;
}

/** MIDI note number of a name like "C4", "F#3", "Bb2". Returns undefined if not a note name. */
export function noteToMidi(name: string): number | undefined {
  const m = /^([A-Ga-g])([#b]*)(-?\d)$/.exec(name);
  if (!m) return undefined;
  return 12 * (Number(m[3]) + 1) + pitchClass(m[1]! + m[2]!);
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];

export type Chord = {
  /** Scale degree of the root, 0-based. */
  degree: number;
  /** Semitone offsets of chord tones from the scale's tonic (root, third, fifth, [seventh]). */
  tones: number[];
};

/** Parses a roman numeral ("i", "IV", "vii", "V7") into chord tones built from the scale. */
export function parseChord(roman: string, scale: readonly number[]): Chord | undefined {
  const m = /^([ivIV]+)(7?)$/.exec(roman.trim());
  if (!m) return undefined;
  const degree = ROMAN.indexOf(m[1]!.toLowerCase());
  if (degree < 0) return undefined;
  const len = scale.length;
  const step = (k: number) => scale[(degree + k) % len]! + 12 * Math.floor((degree + k) / len);
  const tones = [step(0), step(2), step(4)];
  if (m[2]) tones.push(step(6));
  return { degree, tones };
}

/** Semitones from the tonic for a chord-relative token: 1 root, 3 third, 5 fifth, 7 seventh, 2/4/6 scale steps. */
export function chordToneOffset(token: number, chord: Chord, scale: readonly number[]): number {
  const len = scale.length;
  const fromRoot = token - 1;
  const octave = Math.floor(fromRoot / 7);
  const k = fromRoot % 7;
  const idx = chord.degree + k;
  return scale[idx % len]! + 12 * Math.floor(idx / len) + 12 * octave;
}
