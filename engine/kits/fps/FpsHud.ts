import { HUD_CSS } from './hudStyles.ts';

export type HudState = {
  health: number;
  maxHealth: number;
  armor: number;
  weapon: string;
  ammo: string;
  keys: string[];
  prompt: string;
  score: number | undefined;
  dead: boolean;
  /** What the player must do to start ("Click to play ..."), or ''. */
  play: string;
  /** Label of the use action on this device ("E", "USE"). */
  useLabel: string;
};

const KEY_COLORS: Record<string, string> = {
  red: '#e43b3b',
  blue: '#3b7be4',
  yellow: '#e4c63b',
  green: '#3be46a',
};

/** DOM overlay for the first-person HUD. Pure presentation: HudSystem feeds it state. */
export class FpsHud {
  readonly root: HTMLElement;
  private readonly el: Record<string, HTMLElement> = {};
  private readonly messages: { node: HTMLElement; until: number }[] = [];
  private flash = 0;
  private hit = 0;

  constructor(parent: HTMLElement) {
    if (!document.getElementById('fps-hud-css')) {
      const style = document.createElement('style');
      style.id = 'fps-hud-css';
      style.textContent = HUD_CSS;
      document.head.appendChild(style);
    }
    this.root = document.createElement('div');
    this.root.className = 'fps-hud';
    this.root.innerHTML =
      '<div class="flash"></div><div class="cross"></div><div class="hit"></div><div class="msgs"></div>' +
      '<div class="prompt"></div><div class="score"></div>' +
      '<div class="bl"><div class="big hp"></div><div class="bar"><i class="hpbar"></i></div>' +
      '<div class="bar armor"><i class="arbar"></i></div><div class="keys"></div></div>' +
      '<div class="br"><div class="wname"></div><div class="big ammo"></div></div>' +
      '<div class="dead">YOU DIED</div><div class="play"></div>';
    for (const c of [
      'flash',
      'cross',
      'hit',
      'msgs',
      'prompt',
      'score',
      'hp',
      'hpbar',
      'arbar',
      'keys',
      'wname',
      'ammo',
      'dead',
      'play',
    ]) {
      this.el[c] = this.root.querySelector(`.${c}`)!;
    }
    parent.appendChild(this.root);
  }

  message(text: string, seconds: number, now: number): void {
    const node = document.createElement('div');
    node.textContent = text;
    this.el.msgs!.appendChild(node);
    this.messages.push({ node, until: now + seconds });
    while (this.messages.length > 4) this.messages.shift()!.node.remove();
  }

  damageFlash(strength: number): void {
    this.flash = Math.min(1, this.flash + strength);
  }

  hitMarker(): void {
    this.hit = 1;
  }

  update(s: HudState, now: number, dt: number): void {
    const e = this.el;
    e.hp!.textContent = String(Math.ceil(s.health));
    e.hpbar!.style.width = `${Math.max(0, Math.min(100, (s.health / s.maxHealth) * 100))}%`;
    e.arbar!.style.width = `${Math.min(100, s.armor / 2)}%`;
    e.arbar!.parentElement!.style.display = s.armor > 0 ? '' : 'none';
    e.wname!.textContent = s.weapon;
    e.ammo!.textContent = s.ammo;
    e.keys!.innerHTML = s.keys
      .map((k) => `<span style="background:${KEY_COLORS[k] ?? '#ccc'}" title="${k} key"></span>`)
      .join('');
    e.prompt!.innerHTML = s.prompt ? `<b>${s.useLabel}</b>${s.prompt}` : '';
    e.score!.textContent = s.score !== undefined ? `Score ${s.score}` : '';
    e.dead!.style.display = s.dead ? 'flex' : 'none';
    e.play!.style.display = s.play ? '' : 'none';
    if (e.play!.textContent !== s.play) e.play!.textContent = s.play;
    this.flash = Math.max(0, this.flash - dt * 1.8);
    this.hit = Math.max(0, this.hit - dt * 6);
    e.flash!.style.opacity = String(this.flash);
    e.hit!.style.opacity = String(this.hit);
    for (const m of this.messages) m.node.style.opacity = now > m.until ? '0' : '1';
    while (this.messages.length && now > this.messages[0]!.until + 0.5) this.messages.shift()!.node.remove();
  }
}
