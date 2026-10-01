import type { Entity } from '../core/World.ts';

export type Vec3Like = { x: number; y: number; z: number };

export type PlayOpts = {
  /** World position for 3D sound; omit for 2D (UI) sound. */
  at?: Vec3Like;
  /** Follow an entity's Transform while playing. */
  follow?: Entity;
  /** Linear gain multiplier (default 1). */
  volume?: number;
  /** Playback-rate multiplier (default 1), applied on top of the patch's random variation. */
  pitch?: number;
  loop?: boolean;
};

/** A record of one play call; kept by every backend so tests and tools can assert on sound. */
export type AudioRecord = { tick: number; sound: string; at?: [number, number, number]; volume: number };

/**
 * Sound output as systems see it (`ctx.audio`). The browser backend synthesizes and plays;
 * the headless backend only records. Both keep `history` (most recent last).
 */
export type AudioOut = {
  play(sound: string, opts?: PlayOpts): number;
  stop(voice: number): void;
  /** Starts a song (crossfades from the current one), or stops music with null. */
  music(song: string | null, opts?: { volume?: number; fade?: number }): void;
  readonly history: readonly AudioRecord[];
  readonly currentMusic: string | null;
};
