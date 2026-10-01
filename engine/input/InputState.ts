import type { InputSample } from './InputSource.ts';

/**
 * Per-tick action state, read by systems as `ctx.input`. Actions are named in the input map
 * (data/input/*.json): `ctx.input.down('fire')`, `ctx.input.pressed('jump')`.
 */
export class InputState {
  private cur = new Map<string, number>();
  private prev = new Map<string, number>();
  /** Look delta this tick in degrees: x = yaw (+ right), y = pitch (+ up). */
  readonly look = { x: 0, y: 0 };
  /** When false, gameplay should ignore input (menus, editor, pointer not locked). */
  enabled = true;

  /** Engine-only: advances to the next tick's sample. */
  update(sample: InputSample): void {
    this.prev = this.cur;
    this.cur = new Map(sample.actions);
    this.look.x = sample.look.x;
    this.look.y = sample.look.y;
  }

  /** Analog value 0..1 (digital bindings give 0 or 1). */
  value(action: string): number {
    return this.enabled ? (this.cur.get(action) ?? 0) : 0;
  }

  down(action: string): boolean {
    return this.value(action) > 0.5;
  }

  /** True only on the tick the action went down. */
  pressed(action: string): boolean {
    return this.enabled && (this.cur.get(action) ?? 0) > 0.5 && (this.prev.get(action) ?? 0) <= 0.5;
  }

  /** True only on the tick the action went up. */
  released(action: string): boolean {
    return this.enabled && (this.cur.get(action) ?? 0) <= 0.5 && (this.prev.get(action) ?? 0) > 0.5;
  }

  /** `value(positive) - value(negative)`, e.g. `axis('moveLeft', 'moveRight')`. */
  axis(negative: string, positive: string): number {
    return this.value(positive) - this.value(negative);
  }
}
