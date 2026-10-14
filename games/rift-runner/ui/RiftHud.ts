import {
  DomInput,
  type Engine,
  patchMarkup,
  RendererKey,
  VisualFilterSchema,
  WebAudioOut,
} from '#engine/api.ts';
import { applyBuild } from '../progression/applyBuild.ts';
import { applyDifficulty } from '../progression/applyDifficulty.ts';
import { type Difficulty, DifficultySchema } from '../progression/Profile.ts';
import { profileActions } from '../progression/profileActions.ts';
import { type Panel, RunKey } from '../RunState.ts';
import { drawWorldHud } from './drawWorldHud.ts';
import { hudMarkup } from './hudMarkup.ts';
import { panelMarkup } from './panelMarkup.ts';
import { riftStyles } from './riftStyles.ts';

const PANELS: Panel[] = ['menu', 'skills', 'inventory', 'settings', 'forge', 'vendor', 'guide'];

export class RiftHud {
  readonly root: HTMLDivElement;
  private readonly engine: Engine;
  private readonly hud = document.createElement('div');
  private readonly floating = document.createElement('div');
  private readonly modal = document.createElement('div');
  private readonly map = document.createElement('canvas');
  private lastPanel: Panel | undefined;
  private nextDraw = 0;
  private previousHud = '';
  private padPause = false;

  constructor(engine: Engine) {
    this.engine = engine;
    const style = document.createElement('style');
    style.textContent = riftStyles;
    this.root = document.createElement('div');
    this.root.className = 'rift-ui';
    this.map.width = 140;
    this.map.height = 140;
    this.map.className = 'rift-map';
    this.map.setAttribute('aria-label', 'Live arena map');
    this.root.append(style, this.hud, this.map, this.floating, this.modal);
    engine.host!.overlay.append(this.root);
    this.root.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
      if (!button || button.disabled) return;
      this.action(button.dataset.action!, button.dataset.id ?? '');
    });
    this.root.addEventListener('input', (event) => this.setting(event));
    this.root.addEventListener('change', () =>
      engine.service(RunKey).store.save(engine.service(RunKey).profile),
    );
    window.addEventListener('keydown', (event) => {
      if (
        event.repeat ||
        ((event.target as HTMLElement)?.tagName === 'INPUT' &&
          event.code !== 'Escape' &&
          event.code !== 'Tab')
      )
        return;
      const s = engine.service(RunKey);
      if (s.panel && event.code === 'Tab') {
        const focusable = [
          ...this.modal.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'),
        ];
        const index = focusable.indexOf(document.activeElement as HTMLElement);
        if (
          index < 0 ||
          (event.shiftKey && index === 0) ||
          (!event.shiftKey && index === focusable.length - 1)
        ) {
          event.preventDefault();
          focusable[event.shiftKey ? focusable.length - 1 : 0]?.focus();
        }
        return;
      }
      const shortcuts: Record<string, Panel> = {
        KeyI: 'inventory',
        Tab: 'inventory',
        KeyK: 'skills',
        Escape: 'menu',
      };
      if (shortcuts[event.code]) {
        event.preventDefault();
        if (s.panel === shortcuts[event.code] || (event.code === 'Escape' && s.panel)) this.action('close');
        else this.open(shortcuts[event.code]!);
      }
    });
    document.addEventListener('pointerlockchange', () => {
      const s = engine.service(RunKey);
      if (!document.pointerLockElement && s.started && s.phase === 'combat' && !s.panel) this.open('menu');
    });
    window.addEventListener('blur', () => {
      const s = engine.service(RunKey);
      if (s.started && s.phase === 'combat' && !s.panel) this.open('menu');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        const s = engine.service(RunKey);
        s.store.save(s.profile);
      }
    });
    window.addEventListener('pagehide', () => {
      const s = engine.service(RunKey);
      s.store.save(s.profile);
    });
  }

  private lock(): void {
    const engine = this.engine;
    if (engine.inputSource instanceof DomInput) engine.inputSource.lock();
    if (engine.audio instanceof WebAudioOut) engine.audio.resume();
  }

  private open(panel: Panel): void {
    const s = this.engine.service(RunKey);
    s.panel = panel;
    this.lastPanel = undefined;
    this.engine.time.scale = 0;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private action(action: string, id = ''): void {
    const e = this.engine,
      s = e.service(RunKey);
    if (action === 'panel' && PANELS.includes(id as Panel)) this.open(id as Panel);
    else if (action === 'begin' || action === 'close') {
      s.started = true;
      s.panel = '';
      e.time.scale = 1;
      this.lock();
    } else if (action === 'deploy' || action === 'retry' || action === 'town') {
      s.started = true;
      s.panel = '';
      e.time.scale = 1;
      e.loadRoom(action === 'town' ? 'start' : 'expedition');
      this.lock();
    } else if (action === 'camera') {
      s.profile.thirdPerson = !s.profile.thirdPerson;
      applyBuild(e);
      s.store.save(s.profile);
    } else if (action === 'filter-style' || action === 'filter-scope' || action === 'filter-default') {
      const values =
        action === 'filter-default'
          ? { style: 'cel', scope: 'scene' }
          : { ...s.profile.visualFilter, [action === 'filter-style' ? 'style' : 'scope']: id };
      const parsed = VisualFilterSchema.safeParse(values);
      if (parsed.success) {
        s.profile.visualFilter = parsed.data;
        e.tryService(RendererKey)?.setVisualFilter(parsed.data);
        s.store.save(s.profile);
        // Keep keyboard focus, scroll, and the live preview stable while switching options.
        patchMarkup(this.modal, panelMarkup(e));
      }
      return;
    } else if (action === 'preset') {
      const values: Partial<Difficulty> =
        id === 'relentless'
          ? { enemyHealth: 1.4, enemyDamage: 1.6, enemySpeed: 1.2 }
          : id === 'explore'
            ? { playerHealth: 2, playerDamage: 1.5, enemyDamage: 0.5 }
            : {};
      applyDifficulty(e, { ...DifficultySchema.parse({}), ...values });
      s.store.save(s.profile);
    } else profileActions(e, action, id);
    this.lastPanel = undefined;
    this.nextDraw = 0;
  }

  private setting(event: Event): void {
    const input = event.target as HTMLInputElement;
    const key = input.dataset.setting;
    if (!key) return;
    const value = Number(input.value),
      s = this.engine.service(RunKey);
    if (!Number.isFinite(value)) return;
    const output = input.parentElement?.querySelector('output');
    if (output) output.textContent = `${value.toFixed(2)}×`;
    if (key === 'volume') s.profile.volume = Math.max(0, Math.min(1, value));
    else if (key === 'sensitivity') s.profile.sensitivity = Math.max(0.04, Math.min(0.4, value));
    else applyDifficulty(this.engine, { [key]: value });
    s.dirty = true;
  }

  frame(): void {
    const e = this.engine,
      s = e.service(RunKey);
    const gamepad = navigator.getGamepads?.()[0];
    const padDown = !!gamepad?.buttons[9]?.pressed;
    if (padDown && !this.padPause) {
      if (s.panel) this.action('close');
      else this.open('menu');
    }
    this.padPause = padDown;
    if (e.audio instanceof WebAudioOut) e.audio.master.gain.value = s.profile.volume;
    if (e.inputSource instanceof DomInput) e.inputSource.sensitivity = s.profile.sensitivity;
    if (s.panel !== this.lastPanel) {
      this.modal.innerHTML = s.panel ? panelMarkup(e) : '';
      this.lastPanel = s.panel;
      if (s.panel) {
        if (document.pointerLockElement) document.exitPointerLock();
        this.modal.querySelector<HTMLButtonElement>('button')?.focus();
      }
    }
    const paused = !!s.panel || !s.started || s.phase === 'dead';
    e.time.scale = paused ? 0 : 1;
    e.input.enabled = !paused;
    if ((s.phase === 'dead' || s.phase === 'cleared') && document.pointerLockElement)
      document.exitPointerLock();
    const now = performance.now();
    if (now >= this.nextDraw) {
      const markup = hudMarkup(e);
      if (markup !== this.previousHud) {
        patchMarkup(this.hud, markup);
        this.previousHud = markup;
      }
      drawWorldHud(e, this.floating, this.map);
      this.nextDraw = now + 66;
    }
  }
}
