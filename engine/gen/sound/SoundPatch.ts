import { z } from 'zod';
import { defineContentKind } from '../../content/defineContentKind.ts';

export const WAVES = ['sine', 'square', 'saw', 'triangle', 'noise', 'pink', 'brown', 'fm', 'pluck'] as const;

export const EnvelopeSchema = z
  .object({
    attack: z.number().min(0).default(0.005).meta({ description: 'Seconds to full volume' }),
    hold: z.number().min(0).default(0).meta({ description: 'Seconds at full volume' }),
    decay: z.number().min(0).default(0.1).meta({ description: 'Seconds from full to sustain level' }),
    sustain: z.number().min(0).max(1).default(0).meta({ description: 'Level held until note-off (0..1)' }),
    sustainTime: z
      .number()
      .min(0)
      .default(0)
      .meta({ description: 'Seconds held at sustain (one-shots); notes override' }),
    release: z.number().min(0).default(0.1).meta({ description: 'Seconds to silence after sustain' }),
    curve: z.number().min(0.2).max(8).default(2).meta({ description: '1 = linear decay, higher = punchier' }),
  })
  .strict();

export const FilterSchema = z
  .object({
    type: z.enum(['lowpass', 'highpass', 'bandpass']).default('lowpass'),
    freq: z.number().min(10).max(20000).default(2000).meta({ description: 'Cutoff in Hz' }),
    freqEnd: z.number().min(10).max(20000).optional().meta({ description: 'Cutoff at the end (sweep)' }),
    q: z.number().min(0.1).max(30).default(0.8).meta({ description: 'Resonance' }),
  })
  .strict();

export const LayerSchema = z
  .object({
    wave: z.enum(WAVES).default('sine'),
    freq: z
      .number()
      .min(1)
      .max(20000)
      .default(440)
      .meta({ description: 'Hz. In music instruments, 440 = the played note' }),
    freqEnd: z
      .number()
      .min(1)
      .max(20000)
      .optional()
      .meta({ description: 'Pitch glides (exponentially) to this' }),
    glide: z.number().min(0).default(0).meta({ description: 'Glide seconds (0 = whole layer)' }),
    duty: z.number().min(0.05).max(0.95).default(0.5).meta({ description: 'square: pulse width' }),
    fmRatio: z.number().min(0).default(2).meta({ description: 'fm: modulator frequency ratio' }),
    fmIndex: z.number().min(0).default(2).meta({ description: 'fm: modulation depth (brightness)' }),
    fmIndexEnd: z.number().min(0).optional().meta({ description: 'fm: depth at the end (bell → mellow)' }),
    vibratoRate: z.number().min(0).default(0).meta({ description: 'Hz' }),
    vibratoDepth: z.number().min(0).default(0).meta({ description: 'Semitones' }),
    tremoloRate: z.number().min(0).default(0),
    tremoloDepth: z.number().min(0).max(1).default(0),
    detune: z.number().default(0).meta({ description: 'Cents' }),
    env: EnvelopeSchema.prefault({}),
    filter: FilterSchema.optional(),
    gain: z.number().min(0).max(4).default(1),
    pan: z.number().min(-1).max(1).default(0),
    delay: z.number().min(0).default(0).meta({ description: 'Seconds before this layer starts' }),
  })
  .strict();

export const FxSchema = z
  .object({
    drive: z.number().min(0).max(1).default(0).meta({ description: 'Soft distortion' }),
    crush: z.number().min(0).max(1).default(0).meta({ description: 'Bit/sample-rate reduction (lo-fi)' }),
    echoTime: z.number().min(0).max(2).default(0),
    echoFeedback: z.number().min(0).max(0.95).default(0.3),
    echoMix: z.number().min(0).max(1).default(0),
    reverb: z.number().min(0).max(1).default(0).meta({ description: 'Reverb mix' }),
    room: z.number().min(0).max(1).default(0.5).meta({ description: 'Reverb size' }),
  })
  .strict();

export const SoundPatchSchema = z
  .object({
    doc: z.string().default(''),
    gain: z.number().min(0).max(4).default(0.8),
    layers: z.array(LayerSchema).min(1),
    fx: FxSchema.prefault({}),
    pitchVariation: z
      .number()
      .min(0)
      .max(1)
      .default(0)
      .meta({ description: 'Random pitch ± fraction per play' }),
    gainVariation: z
      .number()
      .min(0)
      .max(1)
      .default(0)
      .meta({ description: 'Random volume ± fraction per play' }),
    bus: z.enum(['sfx', 'ui', 'music', 'voice']).default('sfx'),
    maxVoices: z
      .number()
      .int()
      .min(1)
      .max(32)
      .default(6)
      .meta({ description: 'Oldest instance stops beyond this' }),
  })
  .strict();

export type SoundPatch = z.output<typeof SoundPatchSchema>;
export type SoundLayer = z.output<typeof LayerSchema>;
export type Envelope = z.output<typeof EnvelopeSchema>;

/** Synthesized sounds: data/sounds/<id>.json. Layers of oscillators/noise with envelopes, filters, fx. */
export const SoundKind = defineContentKind({
  name: 'sound',
  folder: 'sounds',
  doc: 'Sound patch: layered synth voices (waves, envelopes, pitch glides, filters) plus fx.',
  schema: SoundPatchSchema,
});
