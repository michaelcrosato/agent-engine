import type { InputSample, InputSource } from './InputSource.ts';

/**
 * Input driven by code: the harness and bots use it to play the game headlessly through the
 * same actions a player would press. `tap` holds an action for exactly one tick.
 */
export class ScriptedInput implements InputSource {
  private readonly held = new Map<string, number>();
  private readonly taps = new Set<string>();
  private lookX = 0;
  private lookY = 0;

  hold(action: string, value = 1): void {
    this.held.set(action, value);
  }

  release(action: string): void {
    this.held.delete(action);
  }

  releaseAll(): void {
    this.held.clear();
    this.taps.clear();
  }

  /** Down for exactly the next tick. */
  tap(action: string): void {
    this.taps.add(action);
  }

  /** Adds a look delta (degrees) to the next tick: x = yaw (+ right), y = pitch (+ up). */
  look(dx: number, dy: number): void {
    this.lookX += dx;
    this.lookY += dy;
  }

  isHeld(action: string): boolean {
    return this.held.has(action);
  }

  sample(): InputSample {
    const actions = new Map(this.held);
    for (const a of this.taps) actions.set(a, 1);
    this.taps.clear();
    const look = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return { actions, look };
  }
}
