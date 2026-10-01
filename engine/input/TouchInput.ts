import type { InputSample, InputSource } from './InputSource.ts';
import { stickActions } from './stickActions.ts';
import { TOUCH_CSS } from './touchStyles.ts';

/** An on-screen button: the action it holds, its label, and where it sits (px from bottom-right). */
export type TouchButton = {
  action: string;
  label: string;
  right: number;
  bottom: number;
  size: number;
  /** Dragging this button also turns the view (fire while aiming). */
  look?: boolean;
};

/** Default layout for the FPS kit's actions (see engine/data/input/default.json). */
export const FPS_TOUCH_BUTTONS: readonly TouchButton[] = [
  { action: 'fire', label: 'FIRE', right: 24, bottom: 92, size: 96, look: true },
  { action: 'jump', label: 'JUMP', right: 132, bottom: 92, size: 64 },
  { action: 'use', label: 'USE', right: 128, bottom: 166, size: 56 },
  { action: 'reload', label: 'RLD', right: 44, bottom: 200, size: 52 },
  { action: 'nextWeapon', label: 'SWAP', right: 204, bottom: 150, size: 50 },
  { action: 'crouch', label: 'DUCK', right: 206, bottom: 88, size: 50 },
];

const STICK_RADIUS = 56;

/**
 * Phone and tablet controls: a floating stick on the left half (move; push to the rim to
 * sprint), drag anywhere on the right to look, and buttons for actions. Taps shorter than a
 * tick are latched so they still count. `?touch=1` shows them on desktop for testing.
 */
export class TouchInput implements InputSource {
  /** Degrees of turn per pixel dragged. */
  lookSpeed = 0.22;
  private readonly root: HTMLDivElement;
  private readonly held = new Map<number, string>();
  private readonly latched = new Set<string>();
  private readonly lookers = new Map<number, { x: number; y: number }>();
  private readonly buttons: readonly TouchButton[];
  private stick: { id: number; x: number; y: number; dx: number; dy: number } | undefined;
  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private dx = 0;
  private dy = 0;
  private touched = false;

  constructor(overlay: HTMLElement, buttons: readonly TouchButton[] = FPS_TOUCH_BUTTONS) {
    this.buttons = buttons;
    if (!document.getElementById('engine-touch-css')) {
      const style = document.createElement('style');
      style.id = 'engine-touch-css';
      style.textContent = TOUCH_CSS;
      document.head.append(style);
    }
    this.root = document.createElement('div');
    this.root.className = 'touch-controls';
    const move = this.zone('touch-move');
    const look = this.zone('touch-look');
    this.base = document.createElement('div');
    this.base.className = 'touch-stick';
    this.knob = document.createElement('div');
    this.knob.className = 'touch-knob';
    this.base.append(this.knob);
    this.root.append(move, look, this.base);
    move.addEventListener('pointerdown', (e) => this.stickDown(move, e));
    move.addEventListener('pointermove', (e) => this.stickMove(e));
    for (const t of ['pointerup', 'pointercancel'] as const) move.addEventListener(t, (e) => this.stickUp(e));
    this.lookZone(look);
    for (const b of buttons) this.root.append(this.button(b));
    if (document.fullscreenEnabled) this.root.append(this.fullscreenButton());
    overlay.append(this.root);
    overlay.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private zone(className: string): HTMLDivElement {
    const z = document.createElement('div');
    z.className = className;
    return z;
  }

  private stickDown(el: HTMLElement, e: PointerEvent): void {
    if (this.stick) return;
    this.touched = true;
    el.setPointerCapture(e.pointerId);
    this.stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    this.base.style.left = `${e.clientX}px`;
    this.base.style.top = `${e.clientY}px`;
    this.base.classList.add('on');
    this.knob.style.transform = '';
  }

  private stickMove(e: PointerEvent): void {
    const s = this.stick;
    if (!s || s.id !== e.pointerId) return;
    s.dx = e.clientX - s.x;
    s.dy = e.clientY - s.y;
    const len = Math.hypot(s.dx, s.dy);
    const k = len > STICK_RADIUS ? STICK_RADIUS / len : 1;
    this.knob.style.transform = `translate(${s.dx * k}px, ${s.dy * k}px)`;
  }

  private stickUp(e: PointerEvent): void {
    if (this.stick?.id !== e.pointerId) return;
    this.stick = undefined;
    this.base.classList.remove('on');
  }

  /** Pointers on `el` turn the view while they move. */
  private lookZone(el: HTMLElement): void {
    el.addEventListener('pointerdown', (e) => {
      this.touched = true;
      el.setPointerCapture(e.pointerId);
      this.lookers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    });
    el.addEventListener('pointermove', (e) => {
      const p = this.lookers.get(e.pointerId);
      if (!p) return;
      this.dx += e.clientX - p.x;
      this.dy += e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
    });
    for (const t of ['pointerup', 'pointercancel'] as const)
      el.addEventListener(t, (e) => this.lookers.delete(e.pointerId));
  }

  private button(b: TouchButton): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'touch-btn';
    el.textContent = b.label;
    Object.assign(el.style, {
      right: `${b.right}px`,
      bottom: `${b.bottom}px`,
      width: `${b.size}px`,
      height: `${b.size}px`,
      fontSize: `${Math.round(b.size / 4.6)}px`,
    });
    if (b.look) this.lookZone(el);
    el.addEventListener('pointerdown', (e) => {
      this.touched = true;
      el.setPointerCapture(e.pointerId);
      this.held.set(e.pointerId, b.action);
      this.latched.add(b.action);
      el.classList.add('on');
    });
    for (const t of ['pointerup', 'pointercancel'] as const) {
      el.addEventListener(t, (e) => {
        this.held.delete(e.pointerId);
        el.classList.remove('on');
      });
    }
    return el;
  }

  /** Fullscreen + landscape lock where the browser allows it (Android; not iPhone Safari). */
  private fullscreenButton(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'touch-btn touch-full';
    el.textContent = '⛶';
    el.addEventListener('pointerup', () => {
      const lock = (screen.orientation as { lock?: (o: string) => Promise<void> }).lock;
      if (document.fullscreenElement) void document.exitFullscreen();
      else
        void document.documentElement
          .requestFullscreen()
          .then(() => lock?.call(screen.orientation, 'landscape'))
          .catch(() => {});
    });
    return el;
  }

  sample(): InputSample {
    const actions = this.stick ? stickActions(this.stick.dx, this.stick.dy, STICK_RADIUS) : new Map();
    for (const a of [...this.held.values(), ...this.latched]) actions.set(a, 1);
    const look = { x: this.dx * this.lookSpeed, y: -this.dy * this.lookSpeed };
    this.dx = 0;
    this.dy = 0;
    this.latched.clear();
    return { actions, look };
  }

  prompt(): string {
    if (this.touched) return '';
    const help = 'Left thumb: move (push to the edge to run) · Right thumb: look · FIRE shoots';
    return innerHeight > innerWidth ? `Turn your phone sideways for the best view. ${help}` : help;
  }

  actionLabel(action: string): string {
    return this.buttons.find((b) => b.action === action)?.label ?? action;
  }

  set visible(v: boolean) {
    this.root.hidden = !v;
  }

  dispose(): void {
    this.root.remove();
  }
}
