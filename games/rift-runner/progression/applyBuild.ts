import {
  Arsenal,
  CameraRig,
  CombatStats,
  type Engine,
  FpsController,
  Health,
  hp,
  Inventory,
  Traversal,
  Weapon,
  weaponData,
} from '#engine/api.ts';
import { RunKey } from '../RunState.ts';
import { type Profile, statNames } from './Profile.ts';
import { SkillCatalog } from './SkillCatalog.ts';

export function buildBonuses(engine: Engine, p: Profile): Record<(typeof statNames)[number], number> {
  const b = Object.fromEntries(statNames.map((s) => [s, 0])) as Record<(typeof statNames)[number], number>;
  b.damage = p.mastery.force * 0.01;
  b.health = p.mastery.survival * 0.02;
  b.cooldown = p.mastery.flow * 0.004;
  for (const [id, rank] of Object.entries(p.skills)) {
    if (!engine.content.has(SkillCatalog, id)) continue;
    const node = engine.content.get(SkillCatalog, id);
    for (const stat of node.bonuses) b[stat.stat] += stat.value * Math.min(rank, node.maxRank);
  }
  for (const id of Object.values(p.equipped)) {
    const item = p.inventory.find((i) => i.id === id);
    if (!item) continue;
    for (const affix of item.affixes) b[affix.stat] += affix.value;
    if (item.slot === 'core') b.health += 0.15 * item.power;
    if (item.slot === 'charm') b.damage += 0.08 * item.power;
  }
  return b;
}

export function applyBuild(engine: Engine, fullHeal = false): void {
  const s = engine.service(RunKey);
  const p = s.profile;
  const w = engine.world;
  const player = w.tagged('player')[0];
  if (player === undefined) return;
  const b = buildBonuses(engine, p);
  const item =
    p.inventory.find((i) => i.id === p.equipped.weapon) ?? p.inventory.find((i) => i.slot === 'weapon')!;
  const stats = w.get(player, CombatStats)!;
  Object.assign(stats, {
    damage: (1 + b.damage + (p.level - 1) * 0.045) * p.difficulty.playerDamage,
    incoming: 1 / (1 + b.armor),
    movement: (1 + b.speed) * p.difficulty.playerSpeed,
    critical: Math.min(0.8, 0.07 + b.critical),
    criticalDamage: 1.9,
    element: item.element,
    leech: Math.min(0.3, b.leech),
    chains: Math.min(8, Math.floor(b.chains)),
    detonate: b.detonate,
  });
  const health = w.get(player, Health)!;
  const fraction = hp(health) / health.max;
  health.max = Math.round((140 + (p.level - 1) * 14) * (1 + b.health) * p.difficulty.playerHealth);
  health.current = health.max * (fullHeal ? 1 : fraction);
  health.regen = 1.5 + b.regen * health.max;
  health.regenDelay = 5;
  const traversal = w.get(player, Traversal)!;
  traversal.dashCooldown = Math.max(0.45, 2.2 / (1 + b.cooldown));
  const c = w.get(player, FpsController)!;
  c.walkSpeed = 7.5;
  c.sprintSpeed = 12;
  c.airAccel = 25;
  c.jumpSpeed = 8.5;
  const id = `rift-weapons/${item.base}`;
  const a = w.get(player, Arsenal)!;
  const old = w.get(player, Weapon);
  const wd = weaponData(engine.content, id);
  const replacement = Weapon.create({
    ...wd,
    name: item.name,
    damage: wd.damage * item.power,
    rate: wd.rate * (1 + b.speed * 0.5),
  });
  w.attach(player, Weapon, replacement);
  if (a.weapons[0] !== id || old?.name !== item.name) {
    a.weapons = [id];
    a.current = 0;
    a.mags = {};
    a.reloading = 0;
    a.cooldown = 0;
  }
  const inv = w.get(player, Inventory)!;
  inv.ammo.bullets = 9999;
  const rig = w.get(player, CameraRig)!;
  rig.mode = p.thirdPerson ? 'third' : 'first';
  s.buildDirty = false;
}
