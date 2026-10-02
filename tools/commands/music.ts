import { z } from 'zod';
import { renderSong } from '../../engine/gen/music/renderSong.ts';
import { MusicKind } from '../../engine/gen/music/Song.ts';
import { analyzeSound } from '../../engine/gen/sound/analyzeSound.ts';
import { SoundKind } from '../../engine/gen/sound/SoundPatch.ts';
import { spectrogram } from '../../engine/gen/sound/spectrogram.ts';
import { listGames } from '../../engine/node/loadGame.ts';
import { writePng } from '../../engine/node/writePng.ts';
import { writeWav } from '../../engine/node/writeWav.ts';
import { defineTool } from '../lib/defineTool.ts';
import { openGame } from '../lib/openGame.ts';
import { outPath } from '../lib/outPath.ts';

export const musicTool = defineTool({
  name: 'music',
  summary: 'Render a song to a seamless stereo WAV loop + spectrogram, with timing and loudness stats.',
  usage: 'npm run music -- <song id> [--game agent-engine]\n  e.g. npm run music -- tense',
  args: z.object({ id: z.string(), game: z.string().optional() }),
  positional: ['id'],
  async run(a) {
    const engine = await openGame(a.game ?? listGames()[0]!);
    const song = engine.content.get(MusicKind, a.id);
    const t0 = performance.now();
    const r = renderSong(song, (id) => engine.content.get(SoundKind, id));
    const ms = performance.now() - t0;
    const inter = new Float32Array(r.left.length * 2);
    for (let i = 0; i < r.left.length; i++) {
      inter[i * 2] = r.left[i]!;
      inter[i * 2 + 1] = r.right[i]!;
    }
    const base = `music/${a.id.replace(/\//g, '_')}`;
    writeWav(outPath(`${base}.wav`), inter, r.sampleRate, 2);
    writePng(outPath(`${base}.png`), 1024, 256, spectrogram(r.left, r.sampleRate, 1024, 256));
    const info = analyzeSound(r.left, r.sampleRate);
    return {
      ok: true,
      summary:
        `${a.id}: ${song.bars} bars at ${song.bpm} bpm in ${song.key} ${song.scale} = ${r.seconds.toFixed(2)}s loop, ` +
        `${r.notes} notes, ${song.tracks.length} tracks; rendered in ${ms.toFixed(0)} ms\n` +
        `  peak ${info.peakDb} dB, rms ${info.rmsDb} dB, brightness ${info.centroidHz} Hz`,
      files: [`out/${base}.wav`, `out/${base}.png`],
      details: { ...info, seconds: r.seconds, notes: r.notes },
    };
  },
});
