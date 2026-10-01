/** One tick's worth of input: action values (0..1) and look delta in degrees. */
export type InputSample = {
  actions: ReadonlyMap<string, number>;
  /** Yaw delta (+ = turn right) and pitch delta (+ = look up), in degrees, for this tick. */
  look: { x: number; y: number };
};

/** Where input comes from: devices in the browser (DomInput) or a script in tests (ScriptedInput). */
export type InputSource = {
  /** Called once per fixed tick by the engine. */
  sample(): InputSample;
};
