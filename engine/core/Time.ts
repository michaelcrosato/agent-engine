/** Simulation clock, shared by all systems as `ctx.time`. */
export type Time = {
  /** Fixed tick length in seconds (default 1/60). */
  readonly step: number;
  /** Seconds to advance in this system: `step * scale` in tick phases, real frame delta in 'frame'. */
  dt: number;
  /** Fixed ticks run so far. */
  tick: number;
  /** Simulated seconds so far (sum of scaled steps). */
  elapsed: number;
  /** Real seconds since the last rendered frame. */
  frameDt: number;
  /** 0..1 progress between the last two ticks, for render interpolation. */
  alpha: number;
  /** Time scale for slow motion; 0 pauses simulation. */
  scale: number;
};

export function createTime(step = 1 / 60): Time {
  return { step, dt: step, tick: 0, elapsed: 0, frameDt: 0, alpha: 1, scale: 1 };
}
