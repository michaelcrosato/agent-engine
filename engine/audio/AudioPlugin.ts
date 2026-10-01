import { definePlugin } from '../core/definePlugin.ts';
import { MusicKind } from '../gen/music/Song.ts';
import { SoundKind } from '../gen/sound/SoundPatch.ts';
import { AmbientSound } from './AmbientSound.ts';
import { AmbientSoundSystem } from './AmbientSoundSystem.ts';
import { AudioListenerSystem } from './AudioListenerSystem.ts';
import { AudioRecorder } from './AudioRecorder.ts';
import { WebAudioOut } from './WebAudioOut.ts';

/**
 * Procedural audio: sound patches (data/sounds) and songs (data/music). In the browser sounds
 * are synthesized and played with WebAudio; headless, every play is recorded for tests.
 */
export const AudioPlugin = definePlugin({
  name: 'audio',
  doc: 'Sound patches, music, ambient emitters; WebAudio in the browser, a recorder headless.',
  components: [AmbientSound],
  systems: [AmbientSoundSystem, AudioListenerSystem],
  contentKinds: [SoundKind, MusicKind],
  setup(engine) {
    const muted = engine.host?.muted ?? false;
    if (
      engine.mode === 'browser' &&
      !muted &&
      engine.audio instanceof AudioRecorder &&
      typeof AudioContext !== 'undefined'
    ) {
      engine.audio = new WebAudioOut(engine.content, engine.world, () => engine.time.tick);
    }
  },
  roomReady(engine, room) {
    engine.audio.music(room.music || null);
  },
});
