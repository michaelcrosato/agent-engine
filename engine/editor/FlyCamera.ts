import { Vector3 } from 'three';

const UP = new Vector3(0, 1, 0);

/**
 * Editor camera: hold the right mouse button to look and fly with WASD (Q/E down/up, Shift
 * faster), drag with the middle button to pan, wheel to dolly. Writes `pos`/`target` each frame.
 */
export class FlyCamera {
  readonly pos = new Vector3();
  yaw = 0;
  pitch = -30;
  speed = 8;
  /** True while the right button is held (WASD flies instead of triggering shortcuts). */
  flying = false;
  private panning = false;
  private readonly keys = new Set<string>();
  private readonly off: (() => void)[] = [];

  constructor(el: HTMLElement) {
    const on = <K extends keyof HTMLElementEventMap>(
      t: EventTarget,
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void,
    ) => {
      t.addEventListener(type, fn as EventListener);
      this.off.push(() => t.removeEventListener(type, fn as EventListener));
    };
    on(el, 'mousedown', (e) => {
      if (e.button === 2) this.flying = true;
      if (e.button === 1) {
        this.panning = true;
        e.preventDefault();
      }
    });
    on(window, 'mouseup', (e) => {
      if (e.button === 2) this.flying = false;
      if (e.button === 1) this.panning = false;
    });
    on(window, 'mousemove', (e) => {
      if (this.flying) {
        this.yaw -= e.movementX * 0.2;
        this.pitch = Math.max(-89, Math.min(89, this.pitch - e.movementY * 0.2));
      } else if (this.panning) {
        const right = this.right();
        const s = Math.max(0.01, this.pos.y) * 0.002 + 0.01;
        this.pos.addScaledVector(right, -e.movementX * s).addScaledVector(UP, e.movementY * s);
      }
    });
    on(el, 'wheel', (e) => {
      this.pos.addScaledVector(this.forward(), -Math.sign(e.deltaY) * 1.5);
      e.preventDefault();
    });
    on(window, 'keydown', (e) => this.keys.add(e.code));
    on(window, 'keyup', (e) => this.keys.delete(e.code));
    on(window, 'blur', () => {
      this.keys.clear();
      this.flying = false;
    });
  }

  forward(): Vector3 {
    const y = (this.yaw * Math.PI) / 180;
    const p = (this.pitch * Math.PI) / 180;
    return new Vector3(-Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p));
  }

  right(): Vector3 {
    return this.forward().cross(UP).normalize();
  }

  /** Looks at `target` from `distance` meters, keeping the current yaw and pitch. */
  focus(target: Vector3, distance = 6): void {
    this.pos.copy(target).addScaledVector(this.forward(), -distance);
  }

  /** Places the camera at `from` looking toward `at`. */
  lookFrom(from: Vector3, at: Vector3): void {
    this.pos.copy(from);
    const d = at.clone().sub(from).normalize();
    this.yaw = (Math.atan2(-d.x, -d.z) * 180) / Math.PI;
    this.pitch = (Math.asin(Math.max(-1, Math.min(1, d.y))) * 180) / Math.PI;
  }

  /** Moves with held keys (only while flying) and returns the camera pose. */
  update(dt: number): { pos: Vector3; target: Vector3 } {
    if (this.flying) {
      const k = (c: string) => (this.keys.has(c) ? 1 : 0);
      const fast = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 3 : 1;
      const step = this.speed * fast * dt;
      const f = this.forward();
      this.pos
        .addScaledVector(f, (k('KeyW') - k('KeyS')) * step)
        .addScaledVector(this.right(), (k('KeyD') - k('KeyA')) * step)
        .addScaledVector(UP, (k('KeyE') - k('KeyQ')) * step);
    }
    return { pos: this.pos.clone(), target: this.pos.clone().add(this.forward()) };
  }

  dispose(): void {
    for (const f of this.off) f();
  }
}
