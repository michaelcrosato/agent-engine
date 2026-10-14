import type { Engine } from '#engine/api.ts';
import type { LootItem } from '../progression/Profile.ts';
import { rarityColors, sellValue } from '../progression/rollLoot.ts';
import { SkillCatalog } from '../progression/SkillCatalog.ts';
import { RunKey } from '../RunState.ts';
import { escapeHtml as esc, uiFormat } from './uiFormat.ts';
import { visualFilterMarkup } from './visualFilterMarkup.ts';

const button = (text: string, action: string, id = '', disabled = false, primary = false) =>
  `<button class="${primary ? 'rift-primary' : 'rift-quiet'}" data-action="${action}" data-id="${esc(id)}" ${disabled ? 'disabled' : ''}>${text}</button>`;
function itemCard(item: LootItem, equipped: boolean, compare: LootItem | undefined): string {
  const delta = compare && item.slot === 'weapon' ? Math.round((item.power / compare.power - 1) * 100) : 0;
  return `<article class="rift-item" style="--rarity:${rarityColors[item.rarity]}">
    <div class="rift-item-tag">${item.rarity.toUpperCase()} / ${item.element.toUpperCase()} / ${item.slot.toUpperCase()}</div>
    <b>${esc(item.name)}${item.upgrades ? ` +${item.upgrades}` : ''}</b>
    <div class="rift-small">Item level ${uiFormat(item.level)} · ${item.power.toFixed(2)}× power ${delta ? `<span style="color:${delta > 0 ? '#a6f4d6' : '#f0ab99'}">(${delta > 0 ? '+' : ''}${delta}% vs equipped)</span>` : ''}<br>
    ${item.affixes.length ? item.affixes.map((a) => `${esc(a.name)} +${['chains', 'magnet'].includes(a.stat) ? a.value.toFixed(1) : Number((a.value * 100).toFixed(1)) + '%'}`).join('<br>') : 'A dependable starting point.'}</div>
    ${button(equipped ? 'Equipped' : 'Equip', 'equip', item.id, equipped)}${button(`Salvage · ${sellValue(item)} G`, 'salvage', item.id, equipped)}
  </article>`;
}
function slider(label: string, key: string, value: number, min: number, max: number, step = 0.1): string {
  return `<label class="rift-slider">${label}<output>${value.toFixed(2)}×</output><input aria-label="${label}" type="range" data-setting="${key}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
}

export function panelMarkup(engine: Engine): string {
  const s = engine.service(RunKey),
    p = s.profile;
  const title = {
    menu: 'Take a breath.',
    skills: 'Shape your runner.',
    inventory: 'The spoils of the rift.',
    settings: 'Make it your fight.',
    forge: 'The forge.',
    vendor: 'The exchange.',
    guide: 'The archive.',
    '': '',
  }[s.panel];
  const subtitle = {
    menu: 'EXPEDITION PAUSED',
    skills: 'SKILL CONSTELLATION',
    inventory: 'EQUIPMENT & SALVAGE',
    settings: 'DIFFICULTY & PREFERENCES',
    forge: 'BRASS / MASTER ARTIFICER',
    vendor: 'VEL / SALVAGE BROKER',
    guide: 'ION / BUILD ARCHITECT',
    '': '',
  }[s.panel];
  const head = `<div class="rift-panel-head"><div><div class="rift-eyebrow">${subtitle}</div><h2>${title}</h2></div><div class="rift-panel-meta">${s.panel === 'skills' ? `${p.skillPoints} points available` : `${uiFormat(p.gold)} GOLD`}${button('×', 'close')}</div></div>`;
  let body = '';
  if (s.panel === 'menu')
    body = `<p>Every rift is another chance at a better build. Your equipment, gold and experience are saved automatically.</p>
    ${button('Back to the action', 'close', '', false, true)}${button('Skill constellation', 'panel', 'skills')}${button('Equipment', 'panel', 'inventory')}${button('Difficulty & preferences', 'panel', 'settings')}${s.phase !== 'town' ? button('Return to Lastlight', 'town') : button('Enter the fracture', 'deploy')}
    <p class="rift-small">${esc(s.store.status)} · Highest rift ${p.bestDepth}<br>WASD move · Mouse aim · Shift sprint · Space air jump<br>C slide · Q dash · F frost nova · G ember charge<br>E interact · R reload · V change camera · Esc pause</p>`;
  if (s.panel === 'skills') {
    body = `<p>Spend one point per rank. Follow a branch or combine all three. Earn points by leveling; Ion refunds every point for free in Lastlight.</p><div class="rift-skill-grid">`;
    for (const branch of ['Vanguard', 'Tempest', 'Catalyst']) {
      body += `<section><h3 class="rift-branch-title">${branch}</h3>`;
      const nodes = engine.content
        .ids(SkillCatalog)
        .map((id) => ({ id, ...engine.content.get(SkillCatalog, id) }))
        .filter((n) => n.branch === branch)
        .sort((a, b) => a.tier - b.tier);
      for (const n of nodes) {
        const rank = p.skills[n.id] ?? 0;
        const locked = !!n.requires && !(p.skills[n.requires] ?? 0);
        body += `<button class="rift-node ${rank ? 'owned' : ''} ${locked ? 'locked' : ''}" data-action="skill" data-id="${n.id}" ${locked || rank >= n.maxRank || !p.skillPoints ? 'disabled' : ''}><span class="rank">${rank} / ${n.maxRank}</span><b>${esc(n.name)}</b><small>${esc(n.description)}${locked ? '<br>Requires the preceding node.' : ''}</small></button>`;
      }
      body += '</section>';
    }
    body += `</div><h3 style="margin-top:28px">Ascendant mastery</h3><p>Unlocks at level 25. Spend additional points without a rank cap; each rank strengthens every future run.</p><div class="rift-setting-buttons">${button(`Force ${p.mastery.force} · +1% damage`, 'mastery', 'force', p.level < 25 || !p.skillPoints)}${button(`Survival ${p.mastery.survival} · +2% health`, 'mastery', 'survival', p.level < 25 || !p.skillPoints)}${button(`Flow ${p.mastery.flow} · +0.4% recovery`, 'mastery', 'flow', p.level < 25 || !p.skillPoints)}</div>`;
  }
  if (s.panel === 'inventory') {
    body = `<div class="rift-equipment">${(['weapon', 'core', 'charm'] as const)
      .map((slot) => {
        const item = p.inventory.find((i) => i.id === p.equipped[slot]);
        return `<div class="rift-equipped"><label>${slot.toUpperCase()}</label><b style="color:${item ? rarityColors[item.rarity] : '#b1c1b7'}">${item ? esc(item.name) : 'Empty slot'}</b></div>`;
      })
      .join(
        '',
      )}</div><p>${p.inventory.length} / 40 slots · Equipment applies immediately. Extra drops are salvaged automatically when your pack is full.</p><div class="rift-item-grid">`;
    body += [...p.inventory]
      .reverse()
      .map((item) =>
        itemCard(
          item,
          Object.values(p.equipped).includes(item.id),
          p.inventory.find((i) => i.id === p.equipped[item.slot]),
        ),
      )
      .join('');
    body += '</div>';
  }
  if (s.panel === 'settings')
    body = `${visualFilterMarkup(p.visualFilter)}<h3>Combat tuning</h3><p>All six combat sliders apply to the current expedition immediately. Health changes preserve the percentage remaining.</p>
    <div class="rift-setting-buttons">${button('Standard', 'preset', 'standard')}${button('Relentless', 'preset', 'relentless')}${button('Explore', 'preset', 'explore')}</div>
    <div class="rift-settings"><section><h3>The runner</h3>${slider('Player damage', 'playerDamage', p.difficulty.playerDamage, 0.1, 5)}${slider('Player health', 'playerHealth', p.difficulty.playerHealth, 0.1, 5)}${slider('Player speed', 'playerSpeed', p.difficulty.playerSpeed, 0.25, 3, 0.05)}</section>
    <section><h3>The opposition</h3>${slider('Enemy damage', 'enemyDamage', p.difficulty.enemyDamage, 0.1, 5)}${slider('Enemy health', 'enemyHealth', p.difficulty.enemyHealth, 0.1, 5)}${slider('Enemy speed', 'enemySpeed', p.difficulty.enemySpeed, 0.25, 3, 0.05)}</section></div>
    <div class="rift-settings"><section>${slider('Master volume', 'volume', p.volume, 0, 1, 0.05)}</section><section>${slider('Mouse sensitivity', 'sensitivity', p.sensitivity, 0.04, 0.4, 0.01)}</section></div>
    ${button(p.thirdPerson ? 'Camera: Third person [V]' : 'Camera: First person [V]', 'camera')}<p>${esc(s.store.status)} · Seed ${p.seed} · Deterministic expeditions; loot and skills persist between visits.</p>`;
  if (['forge', 'vendor', 'guide'].includes(s.panel)) {
    const weapon = p.inventory.find((i) => i.id === p.equipped.weapon)!;
    const cost = 45 + weapon.level * 10 + weapon.upgrades * 35;
    const buy = 65 + p.depth * 12;
    const service =
      s.panel === 'forge'
        ? `<h3>Make a good find exceptional.</h3><p>${esc(weapon.name)} · Upgrade ${weapon.upgrades} / 5<br>Each upgrade adds 12% weapon power. Affixes stay with the item.</p>${button(`Temper weapon · ${cost} G`, 'upgrade', '', weapon.upgrades >= 5 || p.gold < cost, true)}`
        : s.panel === 'vendor'
          ? `<h3>Something worth coming back for.</h3><p>A mystery piece of rare or better gear, rolled at your current rift depth. Weapons, reactors and sigils all have a chance to appear.</p>${button(`Acquire gear · ${buy} G`, 'buy', '', p.gold < buy || p.inventory.length >= 40, true)}`
          : `<h3>A build is never set in stone.</h3><p>Refund every spent point and try another path. Free, as often as you like.</p>${button('Refund all skill points', 'respec', '', false, true)}${button('Open skill constellation', 'panel', 'skills')}`;
    body = `<div class="rift-service"><div class="rift-service-mark">${s.panel === 'forge' ? '⌁' : s.panel === 'vendor' ? '◇' : '✧'}</div><section>${service}<p>${button('Restore health · free', 'heal')}${button('View equipment', 'panel', 'inventory')}</p></section></div>`;
  }
  return `<div class="rift-backdrop ${s.panel === 'settings' ? 'rift-preview-backdrop' : ''}"><section class="rift-panel ${s.panel === 'menu' ? 'rift-menu' : ''} ${s.panel === 'settings' ? 'rift-settings-panel' : ''}" role="dialog" aria-modal="true" aria-label="${title}">${head}${body}</section></div>`;
}
