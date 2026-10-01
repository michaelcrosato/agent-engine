# Synth sound patches

Every sound effect is a patch (`data/sounds/<id>.json`): layers of synth voices mixed and run
through effects. Patches are rendered to audio buffers on first use (in the browser) and in
Node by the tools, so agents can inspect them.

```json
{
  "doc": "Big explosion: crack, rumble, debris tail.",
  "gain": 1,
  "pitchVariation": 0.1,
  "layers": [
    { "wave": "brown", "env": { "attack": 0.002, "decay": 0.6, "release": 0.8, "curve": 2 },
      "gain": 1.4, "filter": { "freq": 1800, "freqEnd": 120, "q": 0.7 } },
    { "wave": "noise", "env": { "attack": 0.001, "decay": 0.15, "release": 0.2, "curve": 3 },
      "gain": 0.6, "filter": { "freq": 5000, "freqEnd": 400 } },
    { "wave": "sine", "freq": 70, "freqEnd": 30, "env": { "decay": 0.5, "release": 0.3 } }
  ],
  "fx": { "drive": 0.4, "reverb": 0.3, "room": 0.8 }
}
```

## Layers

- `wave`: `sine`, `square` (`duty`), `saw`, `triangle`, `noise`, `pink`, `brown`, `fm`
  (`fmRatio`, `fmIndex`, `fmIndexEnd`), `pluck` (string).
- Pitch: `freq` → `freqEnd` over `glide` seconds, `vibratoRate/Depth`, `detune` (cents).
- `env`: `attack`, `hold`, `decay`, `sustain` (level), `sustainTime`, `release`, `curve`
  (1 = linear, higher = punchier).
- `filter`: `lowpass`/`highpass`/`bandpass`, `freq` → `freqEnd` sweep, `q`.
- `gain`, `pan`, `delay` (start offset), `tremoloRate/Depth`.

## Patch

`gain`, `fx` (`drive`, `crush`, `echoTime/Feedback/Mix`, `reverb`, `room`), `pitchVariation`
and `gainVariation` (randomize each play), `bus` (`sfx`, `ui`, `music`, `voice`), `maxVoices`.

## Listening without speakers

```sh
npm run sfx -- explosion   # out/sounds/explosion.wav + .png spectrogram, plus numbers and words:
                           # duration, peak/RMS, pitch track, brightness, "short bright click", ...
npm run sfx -- all         # one line per sound
```

Compare the description with what you intended, look at the spectrogram, adjust, repeat.

## Playing sounds

- Data: signal specs (`"sound": "pickup"`), `Health.hurtSound`, `Weapon.sound`, `AmbientSound`
  (loops or periodic, positional), `effect.sound`.
- Code: `ctx.audio.play('pickup', { at: pos })`, `{ follow: entity, loop: true }` returns a voice
  id for `ctx.audio.stop(id)`.
- Tests: `t.sounds('pickup')` lists plays recorded headlessly.
- Music instruments are patches too (`engine/data/sounds/inst/*`); see [music](music.md).
