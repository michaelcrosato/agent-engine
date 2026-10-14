import { Arsenal, type Engine, Health, hp, Traversal, Weapon } from '#engine/api.ts';
import { xpRequired } from '../progression/Profile.ts';
import { RunKey } from '../RunState.ts';
import { levelPlan } from '../world/levelPlan.ts';
import { clockText, escapeHtml as esc, uiFormat } from './uiFormat.ts';

function ability(key: string, title: string, left: number): string {
  return `<div class="rift-ability"><kbd>${key}</kbd><strong>${left > 0 ? left.toFixed(1) : '◇'}</strong><small>${title}</small></div>`;
}

export function hudMarkup(engine: Engine): string {
  const s = engine.service(RunKey),
    p = s.profile;
  const player = engine.world.tagged('player')[0];
  if (player === undefined) return '';
  const h = engine.world.get(player, Health)!;
  const a = engine.world.get(player, Arsenal)!;
  const wd = engine.world.get(player, Weapon)!;
  const tr = engine.world.get(player, Traversal)!;
  const next = s.phase === 'town' ? levelPlan(s.catalog, p.depth, p.seed) : s.plan;
  const locked = !s.panel && s.started;
  const intro = !s.started;
  const enemyCount = engine.world.tagged('enemy').length;
  let html = intro ? '<div class="rift-intro-shade"></div>' : '';
  html += `<header class="rift-header"><div class="rift-brand"><span class="rift-mark"></span><div>RIFT RUNNER<small>BEYOND THE HORIZON</small></div></div>
  <nav class="rift-nav" aria-label="Game menu"><button data-action="panel" data-id="inventory">GEAR <kbd>I</kbd></button><button data-action="panel" data-id="skills">SKILLS${p.skillPoints ? ` · ${p.skillPoints}` : ''} <kbd>K</kbd></button><button data-action="panel" data-id="settings">SETTINGS</button></nav>
  <div class="rift-currency"><span>LV <b>${p.level}</b></span><span>◈ <b>${uiFormat(p.gold)}</b></span><button class="rift-quiet" data-action="panel" data-id="menu" aria-label="Pause menu">II</button></div></header>`;
  if (intro)
    html += `<section class="rift-welcome"><div class="rift-eyebrow">AN AGENT ENGINE ORIGINAL</div><h1>RIFT<br><em>RUNNER</em></h1><p>Chase the perfect drop.<br>Find your own way through.<br>There is always another rift.</p><button class="rift-primary" data-action="begin">ENTER LASTLIGHT &nbsp; &gt;</button><p class="rift-small">WASD + mouse · Click to capture the cursor<br>Your progress saves automatically.</p></section>`;
  else
    html += `<div class="rift-zone"><small>${s.phase === 'town' ? 'SANCTUARY / THE SALVAGE COAST' : `RIFT ${s.plan.depth.toString().padStart(3, '0')} / ${s.plan.biome.name.toUpperCase()}`}</small>${s.phase === 'town' ? 'Lastlight' : esc(s.plan.name)}</div>`;
  if (s.phase === 'town')
    html += `<aside class="rift-objective"><div class="rift-eyebrow">NEXT EXPEDITION / ${next.depth.toString().padStart(3, '0')}</div><h2>${esc(next.name)}</h2><p>${esc(next.hint)}</p><button class="rift-primary" data-action="deploy">ENTER THE FRACTURE &nbsp; &gt;</button><div class="rift-minirow"><span>${next.biome.name.toUpperCase()}</span><span>${next.boss ? 'WARDEN' : next.waves + ' WAVES'}</span></div></aside>`;
  else if (s.phase === 'combat')
    html += `<aside class="rift-objective"><div class="rift-eyebrow">CLEAR THE FRACTURE</div><h2>Wave ${Math.max(1, s.wave)} <span style="opacity:.4">/ ${s.plan.waves}</span></h2><p>${esc(s.plan.hint)}</p><div class="rift-minirow"><span>${enemyCount + s.pending} HOSTILES</span><span>${clockText(s.elapsed)}</span></div></aside>`;
  if (!intro)
    html += `<div class="rift-bottom"><section class="rift-vitals"><div class="rift-runner-label"><span>THE RUNNER / LV ${p.level}</span><b>${uiFormat(hp(h))}</b></div><div class="rift-bar"><span style="width:${Math.max(0, (hp(h) / h.max) * 100)}%"></span></div><div class="rift-xp"><span style="width:${(p.xp / xpRequired(p.level)) * 100}%"></span></div><div class="rift-small">${uiFormat(p.xp)} / ${uiFormat(xpRequired(p.level))} XP &nbsp; · &nbsp; ${s.phase === 'town' ? 'SAFE HAVEN' : 'KEEP MOVING'}</div></section>
  <div class="rift-abilities">${ability('Q', 'PHASE DASH', tr.cooldown)}${ability('F', 'FROST NOVA', s.pulse)}${ability('G', 'EMBER CHARGE', s.grenade)}</div>
  <section class="rift-weapon"><strong>${a.reloading > 0 ? '…' : (a.mags[a.weapons[0]!] ?? wd.magazine)}</strong> <span>/ ${wd.magazine}</span><p>${esc(wd.name).toUpperCase()}</p><div class="rift-small">${a.reloading > 0 ? 'RELOADING' : 'R RELOAD · UNLIMITED RESERVE'}</div></section></div>
  <div class="rift-controls">SHIFT sprint · SPACE air jump · C slide · V camera<br>I equipment · K skills · ESC pause</div>`;
  if (locked) html += `<div class="rift-crosshair ${engine.time.elapsed < s.hitUntil ? 'hit' : ''}"></div>`;
  if (s.prompt && locked) html += `<div class="rift-prompt">${esc(s.prompt)}</div>`;
  if (s.notice && engine.time.elapsed < s.noticeUntil && !intro)
    html += `<div class="rift-notice">${esc(s.notice)}</div>`;
  if (engine.time.elapsed < s.hurtUntil) html += '<div class="rift-hurt"></div>';
  if (s.phase === 'cleared' && !s.panel)
    html += `<section class="rift-clear"><div class="rift-eyebrow">RIFT ${s.plan.depth} / SECURED</div><h2>One more run?</h2><p>${s.kills} hostiles cleared · ${clockText(s.elapsed)}<br>+${35 + s.plan.depth * 10} gold · ${s.reward ? esc(s.reward.name) : 'Reward secured'}</p><button class="rift-primary" data-action="deploy">PUSH TO RIFT ${p.depth} &nbsp; &gt;</button><button class="rift-quiet" data-action="town">RETURN TO LASTLIGHT</button><button class="rift-quiet" data-action="panel" data-id="inventory">INSPECT YOUR LOOT</button></section>`;
  if (s.phase === 'dead' && !s.panel)
    html += `<section class="rift-clear"><div class="rift-eyebrow">THE RIFT HITS BACK</div><h2>Get back out there.</h2><p>Your gold, experience and equipment are safe.<br>Change your build, or tune the difficulty.</p><button class="rift-primary" data-action="retry">RETRY RIFT ${p.depth}</button><button class="rift-quiet" data-action="town">RETURN TO LASTLIGHT</button><button class="rift-quiet" data-action="panel" data-id="settings">ADJUST DIFFICULTY</button></section>`;
  return `${html}<div class="rift-footer">AGENT ENGINE / PROCEDURAL WORLDS. ENDLESS POSSIBILITIES.</div>`;
}
