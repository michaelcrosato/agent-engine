import { CombatStats, type Engine, Health, hp } from '#engine/api.ts';
import { RunKey } from '../RunState.ts';
import { RiftEnemy } from '../systems/RiftEnemy.ts';
import { applyBuild } from './applyBuild.ts';
import { type Difficulty, DifficultySchema } from './Profile.ts';

export function applyDifficulty(engine: Engine, values: Partial<Difficulty>): boolean {
  const s = engine.service(RunKey);
  const parsed = DifficultySchema.safeParse({ ...s.profile.difficulty, ...values });
  if (!parsed.success) return false;
  s.profile.difficulty = parsed.data;
  applyBuild(engine);
  for (const e of engine.world.query(RiftEnemy, Health, CombatStats)) {
    const h = engine.world.get(e, Health)!;
    const fraction = hp(h) / h.max;
    h.max = engine.world.get(e, RiftEnemy)!.baseHealth * parsed.data.enemyHealth;
    h.current = fraction * h.max;
    const stats = engine.world.get(e, CombatStats)!;
    stats.damage = parsed.data.enemyDamage;
    stats.movement = parsed.data.enemySpeed;
  }
  s.dirty = true;
  return true;
}
