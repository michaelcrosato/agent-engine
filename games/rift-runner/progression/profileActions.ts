import { type Engine, Health } from '#engine/api.ts';
import { notifyRun, RunKey } from '../RunState.ts';
import { applyBuild } from './applyBuild.ts';
import { rollLoot, sellValue } from './rollLoot.ts';
import { SkillCatalog } from './SkillCatalog.ts';

/** Shared UI/headless actions validate costs and prerequisites before mutating the profile. */
export function profileActions(engine: Engine, action: string, id = ''): boolean {
  const s = engine.service(RunKey);
  const p = s.profile;
  let message = '';
  if (action === 'skill') {
    if (!engine.content.has(SkillCatalog, id)) return false;
    const skill = engine.content.get(SkillCatalog, id);
    if (
      p.skillPoints < 1 ||
      (p.skills[id] ?? 0) >= skill.maxRank ||
      (skill.requires && !(p.skills[skill.requires] ?? 0))
    )
      return false;
    p.skills[id] = (p.skills[id] ?? 0) + 1;
    p.skillPoints--;
    message = `${skill.name} · rank ${p.skills[id]}`;
  } else if (action === 'mastery') {
    if (p.level < 25 || p.skillPoints < 1 || !['force', 'survival', 'flow'].includes(id)) return false;
    p.mastery[id as keyof typeof p.mastery]++;
    p.skillPoints--;
    message = `Ascendant ${id} increased`;
  } else if (action === 'equip') {
    const item = p.inventory.find((i) => i.id === id);
    if (!item) return false;
    p.equipped[item.slot] = item.id;
    message = `Equipped ${item.name}`;
  } else if (action === 'salvage') {
    const item = p.inventory.find((i) => i.id === id);
    if (!item || Object.values(p.equipped).includes(id)) return false;
    p.gold += sellValue(item);
    p.inventory = p.inventory.filter((i) => i.id !== id);
    message = `Salvaged · +${sellValue(item)} gold`;
  } else if (action === 'buy') {
    if (s.phase !== 'town' || p.inventory.length >= 40) return false;
    const cost = 65 + p.depth * 12;
    if (p.gold < cost) return false;
    p.gold -= cost;
    const item = rollLoot(p, s.catalog, 2);
    p.inventory.push(item);
    message = `Acquired ${item.name}`;
  } else if (action === 'upgrade') {
    if (s.phase !== 'town') return false;
    const item = p.inventory.find((i) => i.id === p.equipped.weapon);
    if (!item || item.upgrades >= 5) return false;
    const cost = 45 + item.level * 10 + item.upgrades * 35;
    if (p.gold < cost) return false;
    p.gold -= cost;
    item.power *= 1.12;
    item.upgrades++;
    message = `${item.name} · +${item.upgrades}`;
  } else if (action === 'respec') {
    if (s.phase !== 'town') return false;
    p.skillPoints += Object.values(p.skills).reduce((a, b) => a + b, 0);
    p.skillPoints += p.mastery.force + p.mastery.survival + p.mastery.flow;
    p.mastery = { force: 0, survival: 0, flow: 0 };
    p.skills = {};
    message = 'All skill points refunded';
  } else if (action === 'heal') {
    if (s.phase !== 'town') return false;
    const player = engine.world.tagged('player')[0];
    if (player !== undefined) {
      const h = engine.world.get(player, Health)!;
      h.current = h.max;
    }
    message = 'Reactor restored. Ready for another run.';
  } else return false;
  applyBuild(engine);
  s.dirty = true;
  s.store.save(p);
  notifyRun(s, message, engine.time.elapsed);
  return true;
}
