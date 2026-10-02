import { z } from 'zod';
import { analyzeSound } from '../../engine/gen/sound/analyzeSound.ts';
import { renderPatch, SAMPLE_RATE } from '../../engine/gen/sound/renderPatch.ts';
import { SoundKind } from '../../engine/gen/sound/SoundPatch.ts';
import { spectrogram } from '../../engine/gen/sound/spectrogram.ts';
import { listGames } from '../../engine/node/loadGame.ts';
import { writePng } from '../../engine/node/writePng.ts';
import { writeWav } from '../../engine/node/writeWav.ts';
import { defineTool } from '../lib/defineTool.ts';
import { openGame } from '../lib/openGame.ts';
import { outPath } from '../lib/outPath.ts';

export const sfxTool = defineTool({
  name: 'sfx',
  summary: 'Synthesize sound patches to WAV + spectrogram PNG and describe them in numbers and words.',
  usage:
    'npm run sfx -- <sound id | all> [--game agent-engine] [--pitch 1]\n' +
    '  e.g. npm run sfx -- explosion    npm run sfx -- all   (one line per sound)',
  args: z.object({
    id: z.string().meta({ description: 'Sound id, or "all"' }),
    game: z.string().optional(),
    pitch: z
      .number()
      .positive()
      .default(1)
      .meta({ description: 'Pitch multiplier (instruments: note / 440 Hz)' }),
  }),
  positional: ['id'],
  async run(a) {
    const engine = await openGame(a.game ?? listGames()[0]!);
    const ids = a.id === 'all' ? engine.content.ids(SoundKind) : [a.id];
    const lines: string[] = [];
    const files: string[] = [];
    const details: Record<string, unknown> = {};
    for (const id of ids) {
      const patch = engine.content.get(SoundKind, id);
      const samples = renderPatch(patch, { pitch: a.pitch });
      const info = analyzeSound(samples, SAMPLE_RATE);
      details[id] = info;
      const base = `sounds/${id.replace(/\//g, '_')}`;
      if (ids.length === 1) {
        writeWav(outPath(`${base}.wav`), samples, SAMPLE_RATE);
        writePng(outPath(`${base}.png`), 512, 256, spectrogram(samples, SAMPLE_RATE));
        files.push(`out/${base}.wav`, `out/${base}.png`);
        lines.push(
          `${id}: ${info.character}`,
          `  ${info.audibleSeconds}s audible (${info.seconds}s total), peak ${info.peakDb} dB, rms ${info.rmsDb} dB,` +
            ` attack ${info.attackSeconds}s, brightness ${info.centroidHz} Hz, dominant ${info.dominantHz} Hz`,
          '  png: waveform on top, spectrogram below (time →, low pitch at bottom)',
        );
      } else {
        lines.push(
          `${id.padEnd(16)} ${String(info.audibleSeconds).padStart(5)}s ${String(info.peakDb).padStart(6)} dB ${String(info.centroidHz).padStart(6)} Hz  ${info.character}`,
        );
      }
    }
    return { ok: true, summary: lines.join('\n'), files, details };
  },
});
