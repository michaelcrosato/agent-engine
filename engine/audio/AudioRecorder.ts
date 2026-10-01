import type { AudioOut, AudioRecord, PlayOpts } from './AudioOut.ts';

/** Headless AudioOut: records play calls (bounded) without producing sound. */
export class AudioRecorder implements AudioOut {
  readonly history: AudioRecord[] = [];
  currentMusic: string | null = null;
  private voice = 0;
  private readonly clock: () => number;
  private readonly max: number;

  constructor(clock: () => number, max = 2000) {
    this.clock = clock;
    this.max = max;
  }

  play(sound: string, opts: PlayOpts = {}): number {
    const rec: AudioRecord = { tick: this.clock(), sound, volume: opts.volume ?? 1 };
    if (opts.at) rec.at = [opts.at.x, opts.at.y, opts.at.z];
    this.history.push(rec);
    if (this.history.length > this.max) this.history.splice(0, this.history.length - this.max);
    return ++this.voice;
  }

  stop(_voice: number): void {}

  music(song: string | null): void {
    this.currentMusic = song;
  }
}
