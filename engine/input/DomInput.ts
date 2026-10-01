import type { InputMap } from './InputMap.ts';
import type { InputSample, InputSource } from './InputSource.ts';

const PAD_BUTTONS = [
  'A',
  'B',
  'X',
  'Y',
  'LB',
  'RB',
  'LT',
  'RT',
  'Back',
  'Start',
  'LS',
  'RS',
  'Up',
  'Down',
  'Left',
  'Right',
];
const PAD_AXES: Record<string, [number, number]> = {
  'LeftX+': [0, 1],
  'LeftX-': [0, -1],
  'LeftY+': [1, 1],
  'LeftY-': [1, -1],
  'RightX+': [2, 1],
  'RightX-': [2, -1],
  'RightY+': [3, 1],
  'RightY-': [3, -1],
};

/**
 * Browser input: keyboard, mouse (pointer lock), wheel, and the first gamepad, mapped to
 * actions through the input map. Presses shorter than a tick are latched so they still count.
 */
export class DomInput implements InputSource {
  private readonly held = new Set<string>();
  private readonly latched = new Set<string>();
  private dx = 0;
  private dy = 0;
  private readonly el: HTMLElement;
  private readonly getMap: () => InputMap;
  private readonly step: number;
  private readonly off: (() => void)[] = [];
  /** When false, mouse movement is ignored unless the pointer is locked. */
  requireLock = true;

  constructor(el: HTMLElement, getMap: () => InputMap, step: number) {
    this.el = el;
    this.getMap = getMap;
    this.step = step;
    const on = <K extends keyof WindowEventMap>(
      t: EventTarget,
      type: K,
      fn: (e: WindowEventMap[K]) => void,
    ) => {
      t.addEventListener(type, fn as EventListener);
      this.off.push(() => t.removeEventListener(type, fn as EventListener));
    };
    on(window, 'keydown', (e) => {
      if (e.repeat || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      this.press(e.code);
    });
    on(window, 'keyup', (e) => this.held.delete(e.code));
    on(el, 'mousedown', (e) => this.press(`Mouse${e.button}`));
    on(window, 'mouseup', (e) => this.held.delete(`Mouse${e.button}`));
    on(window, 'mousemove', (e) => {
      if (this.requireLock && document.pointerLockElement !== el) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    on(el, 'wheel', (e) => this.latched.add(e.deltaY < 0 ? 'WheelUp' : 'WheelDown'));
    on(el, 'contextmenu', (e) => e.preventDefault());
    on(window, 'blur', () => this.held.clear());
  }

  private press(code: string): void {
    this.held.add(code);
    this.latched.add(code);
  }

  get locked(): boolean {
    return document.pointerLockElement === this.el;
  }

  lock(): void {
    if (!this.locked) void this.el.requestPointerLock?.();
  }

  private padValue(pad: Gamepad | null | undefined, name: string, deadzone: number): number {
    if (!pad) return 0;
    const b = PAD_BUTTONS.indexOf(name);
    if (b >= 0) return pad.buttons[b]?.value ?? 0;
    const axis = PAD_AXES[name];
    if (!axis) return 0;
    const v = (pad.axes[axis[0]] ?? 0) * axis[1];
    return v > deadzone ? (v - deadzone) / (1 - deadzone) : 0;
  }

  sample(): InputSample {
    const map = this.getMap();
    const pad = typeof navigator !== 'undefined' ? navigator.getGamepads?.()[0] : undefined;
    const actions = new Map<string, number>();
    for (const [action, bindings] of Object.entries(map.actions)) {
      let v = 0;
      for (const b of bindings) {
        if (b.startsWith('Pad:')) v = Math.max(v, this.padValue(pad, b.slice(4), map.gamepad.deadzone));
        else if (this.held.has(b) || this.latched.has(b)) v = 1;
      }
      if (v > 0) actions.set(action, v);
    }
    const sens = map.mouse.sensitivity;
    let x = this.dx * sens;
    let y = -this.dy * sens * (map.mouse.invertY ? -1 : 1);
    if (pad) {
      const speed = map.gamepad.lookSpeed * this.step;
      const dz = map.gamepad.deadzone;
      const rx = Math.abs(pad.axes[2] ?? 0) > dz ? (pad.axes[2] ?? 0) : 0;
      const ry = Math.abs(pad.axes[3] ?? 0) > dz ? (pad.axes[3] ?? 0) : 0;
      x += rx * speed;
      y -= ry * speed * (map.gamepad.invertY ? -1 : 1);
    }
    this.dx = 0;
    this.dy = 0;
    this.latched.clear();
    return { actions, look: { x, y } };
  }

  dispose(): void {
    for (const f of this.off) f();
  }
}
