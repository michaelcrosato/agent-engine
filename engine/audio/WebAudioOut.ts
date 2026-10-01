import type { ContentStore } from '../content/ContentStore.ts';
import { Transform } from '../core/Transform.ts';
import type { Entity, World } from '../core/World.ts';
import { renderSong } from '../gen/music/renderSong.ts';
import { MusicKind } from '../gen/music/Song.ts';
import { renderPatch, SAMPLE_RATE } from '../gen/sound/renderPatch.ts';
import { SoundKind } from '../gen/sound/SoundPatch.ts';
import type { AudioOut, AudioRecord, PlayOpts } from './AudioOut.ts';

type Voice = { id: number; sound: string; src: AudioBufferSourceNode; panner?: PannerNode; follow?: Entity };

/**
 * Browser AudioOut: synthesizes sound patches into AudioBuffers (cached per id), plays them on
 * buses (sfx, ui, music, voice), positions 3D voices, and loops rendered songs for music.
 */
export class WebAudioOut implements AudioOut {
  readonly history: AudioRecord[] = [];
  currentMusic: string | null = null;
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly buses: Record<'sfx' | 'ui' | 'music' | 'voice', GainNode>;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly voices: Voice[] = [];
  private musicSrc: { src: AudioBufferSourceNode; gain: GainNode } | undefined;
  private nextId = 0;
  private readonly content: ContentStore;
  private readonly world: World;
  private readonly clock: () => number;

  constructor(content: ContentStore, world: World, clock: () => number) {
    this.content = content;
    this.world = world;
    this.clock = clock;
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    const bus = (g: number) => {
      const n = this.ctx.createGain();
      n.gain.value = g;
      n.connect(this.master);
      return n;
    };
    this.buses = { sfx: bus(1), ui: bus(0.9), music: bus(0.55), voice: bus(1) };
  }

  /** Browsers start audio suspended; call from a user gesture (the app does on first click). */
  resume(): void {
    if (this.ctx.state !== 'running') void this.ctx.resume();
  }

  /** Drops cached buffers (hot reload of a sound), or all of them. */
  invalidate(id?: string): void {
    if (id) this.buffers.delete(id);
    else this.buffers.clear();
  }

  private buffer(id: string): AudioBuffer {
    let b = this.buffers.get(id);
    if (b) return b;
    const samples = renderPatch(this.content.get(SoundKind, id), { sampleRate: SAMPLE_RATE });
    b = this.ctx.createBuffer(1, samples.length, SAMPLE_RATE);
    b.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    this.buffers.set(id, b);
    return b;
  }

  play(sound: string, opts: PlayOpts = {}): number {
    const rec: AudioRecord = { tick: this.clock(), sound, volume: opts.volume ?? 1 };
    if (opts.at) rec.at = [opts.at.x, opts.at.y, opts.at.z];
    this.history.push(rec);
    if (this.history.length > 500) this.history.shift();
    const patch = this.content.get(SoundKind, sound);
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer(sound);
    src.loop = opts.loop ?? false;
    const jitter = (amount: number) => 1 + (Math.random() * 2 - 1) * amount;
    src.playbackRate.value = (opts.pitch ?? 1) * jitter(patch.pitchVariation);
    const gain = this.ctx.createGain();
    gain.gain.value = (opts.volume ?? 1) * jitter(patch.gainVariation);
    src.connect(gain);
    const voice: Voice = { id: ++this.nextId, sound, src };
    if (opts.at || opts.follow !== undefined) {
      const p = this.ctx.createPanner();
      p.panningModel = 'HRTF';
      p.distanceModel = 'inverse';
      p.refDistance = 2;
      p.rolloffFactor = 1.2;
      const at =
        opts.at ?? (opts.follow !== undefined ? this.world.get(opts.follow, Transform)?.pos : undefined);
      if (at) p.positionX.value = at.x;
      if (at) p.positionY.value = at.y;
      if (at) p.positionZ.value = at.z;
      gain.connect(p);
      p.connect(this.buses[patch.bus]);
      voice.panner = p;
      if (opts.follow !== undefined) voice.follow = opts.follow;
    } else gain.connect(this.buses[patch.bus]);
    src.start();
    src.onended = () => {
      const i = this.voices.indexOf(voice);
      if (i >= 0) this.voices.splice(i, 1);
    };
    this.voices.push(voice);
    const same = this.voices.filter((v) => v.sound === sound);
    if (same.length > patch.maxVoices) same[0]!.src.stop();
    return voice.id;
  }

  stop(id: number): void {
    this.voices.find((v) => v.id === id)?.src.stop();
  }

  /** Moves following voices to their entities and the listener to the camera (call per frame). */
  update(listener: {
    pos: { x: number; y: number; z: number };
    forward: { x: number; y: number; z: number };
  }): void {
    const l = this.ctx.listener;
    l.positionX.value = listener.pos.x;
    l.positionY.value = listener.pos.y;
    l.positionZ.value = listener.pos.z;
    l.forwardX.value = listener.forward.x;
    l.forwardY.value = listener.forward.y;
    l.forwardZ.value = listener.forward.z;
    for (const v of this.voices) {
      if (v.follow === undefined || !v.panner) continue;
      const t = this.world.get(v.follow, Transform);
      if (!t) continue;
      v.panner.positionX.value = t.pos.x;
      v.panner.positionY.value = t.pos.y;
      v.panner.positionZ.value = t.pos.z;
    }
  }

  music(song: string | null, opts: { volume?: number; fade?: number } = {}): void {
    if (song === this.currentMusic) return;
    this.currentMusic = song;
    const fade = opts.fade ?? 1.5;
    const now = this.ctx.currentTime;
    if (this.musicSrc) {
      const old = this.musicSrc;
      old.gain.gain.setTargetAtTime(0, now, fade / 4);
      old.src.stop(now + fade * 2);
      this.musicSrc = undefined;
    }
    if (!song) return;
    const r = renderSong(this.content.get(MusicKind, song), (id) => this.content.get(SoundKind, id));
    const buf = this.ctx.createBuffer(2, r.left.length, r.sampleRate);
    buf.copyToChannel(r.left as Float32Array<ArrayBuffer>, 0);
    buf.copyToChannel(r.right as Float32Array<ArrayBuffer>, 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(opts.volume ?? 1, now, fade / 4);
    src.connect(gain).connect(this.buses.music);
    src.start();
    this.musicSrc = { src, gain };
  }
}
