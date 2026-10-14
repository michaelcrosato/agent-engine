import {
  CombatStats,
  ContentGrammar,
  ElementState,
  type Engine,
  Health,
  Model,
  Transform,
  yawQuat,
} from '#engine/api.ts';
import { depthPower } from '../progression/rollLoot.ts';
import { RunKey } from '../RunState.ts';
import { RiftEnemy } from '../systems/RiftEnemy.ts';

export function spawnEnemy(engine: Engine, index: number, boss = false): number {
  const s = engine.service(RunKey);
  const plan = s.plan;
  const grammar = new ContentGrammar(`${plan.seed}/wave${s.wave}/enemy${index}`);
  const tokens = grammar.compose(
    [
      { name: 'body', choices: s.catalog.chassis },
      { name: 'boss', choices: s.catalog.bosses },
      { name: 'behavior', choices: ['stalker', 'gunner', 'charger', 'orbiter'].map((id) => ({ id })) },
      {
        name: 'element',
        choices: (plan.depth > 2 ? ['kinetic', 'fire', 'frost', 'shock'] : ['kinetic']).map((id) => ({ id })),
      },
      {
        name: 'modifier',
        choices: (plan.depth > 3 ? ['none', 'swift', 'armored', 'volatile', 'vampiric'] : ['none']).map(
          (id) => ({ id }),
        ),
      },
    ],
    [
      ...(plan.biome.tags ?? []),
      ...(s.catalog.layouts.find((entry) => entry.id === plan.layout)?.tags ?? []),
    ],
  );
  const chassis = s.catalog.chassis.find((c) => c.id === tokens.body)!;
  const bossFrame = s.catalog.bosses.find((b) => b.id === tokens.boss)!;
  const at = s.spawnPoints[index % s.spawnPoints.length]!;
  const e = engine.spawn(boss ? bossFrame.prefab : chassis.prefab, {
    name: boss ? 'warden' : `enemy-${s.wave}-${index}`,
    pos: [at[0] + (index % 3) * 0.8, at[1], at[2]],
    tags: ['enemy'],
    scale: boss ? 1.8 : 1,
  });
  const power = depthPower(plan.depth);
  const baseHealth =
    (boss ? bossFrame.health : chassis.health) * power * (tokens.modifier === 'armored' ? 1.6 : 1);
  const w = engine.world;
  w.add(e, Health, {
    max: baseHealth * s.profile.difficulty.enemyHealth,
    destroyOnDeath: true,
    deathEffect: 'rift-death',
    hurtSound: 'robot-hurt',
  });
  w.add(e, CombatStats, {
    damage: s.profile.difficulty.enemyDamage,
    element: tokens.element as 'kinetic',
    movement: s.profile.difficulty.enemySpeed,
    leech: tokens.modifier === 'vampiric' ? 0.2 : 0,
    chains: tokens.element === 'shock' ? 1 : 0,
  });
  w.add(e, ElementState);
  const title = boss
    ? `${plan.biome.name.split(' ')[0]} ${bossFrame.name}`
    : `${tokens.modifier === 'none' ? '' : tokens.modifier + ' '}${chassis.name}`;
  w.add(e, RiftEnemy, {
    title,
    behavior: (plan.depth > 5 ? tokens.behavior : chassis.behavior) as 'stalker',
    modifier: tokens.modifier as 'none',
    baseHealth,
    speed: chassis.speed * (tokens.modifier === 'swift' ? 1.35 : 1),
    damage: (boss ? 30 : 15) * (1 + Math.log2(plan.depth + 1) * 0.12 + plan.depth * 0.025),
    boss,
    patterns: bossFrame.patterns,
    cooldown: boss ? 1.8 : 0.9 + (index % 4) * 0.25,
  });
  const colors = { kinetic: '#ffffff', fire: '#ffb185', frost: '#a9dfff', shock: '#c7b1ff' };
  w.get(e, Model)!.tint = colors[tokens.element as keyof typeof colors];
  w.get(e, Transform)!.rot.copy(yawQuat(180));
  return e;
}
