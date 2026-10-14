import { Animator, CombatStats, Died, defineSystem, Health, Model, Transform } from '#engine/api.ts';
import { applyBuild } from '../progression/applyBuild.ts';
import { grantXp } from '../progression/Profile.ts';
import { rollLoot } from '../progression/rollLoot.ts';
import { notifyRun, RunKey } from '../RunState.ts';
import { spawnEnemy } from '../world/spawnEnemy.ts';
import { spawnLoot } from '../world/spawnLoot.ts';
import { spawnPulse } from '../world/spawnPulse.ts';
import { RiftEnemy } from './RiftEnemy.ts';

export const ExpeditionSystem = defineSystem({
  name: 'ExpeditionSystem',
  doc: 'Finite encounter populations, kill rewards, boss milestones, death and endless progression.',
  phase: 'late',
  order: -10,
  run(ctx) {
    const s = ctx.service(RunKey);
    const w = ctx.world;
    const player = w.tagged('player')[0];
    for (const death of ctx.events.read(Died)) {
      if (death.entity === player) {
        s.phase = 'dead';
        s.deathAt = ctx.time.elapsed;
        const a = w.get(player, Animator);
        if (a) a.play = 'death';
        s.store.save(s.profile);
        continue;
      }
      const enemy = w.get(death.entity, RiftEnemy);
      if (!enemy) continue;
      s.kills++;
      s.profile.kills++;
      const reward = (enemy.boss ? 180 : 24) + s.plan.depth * 6;
      const levels = grantXp(s.profile, reward);
      if (levels) {
        notifyRun(
          s,
          `LEVEL ${s.profile.level} · +${levels} skill point${levels > 1 ? 's' : ''}`,
          ctx.time.elapsed,
        );
        applyBuild(ctx.engine);
        if (player !== undefined) w.get(player, Health)!.current = w.get(player, Health)!.max;
        ctx.audio.play('pickup');
      }
      const at = w.get(death.entity, Transform)!.pos;
      spawnLoot(ctx.engine, at, undefined, 5 + s.plan.depth * 2 + (enemy.boss ? 40 : 0));
      if (enemy.boss || ctx.rng.chance(0.28))
        spawnLoot(ctx.engine, at, rollLoot(s.profile, s.catalog, enemy.boss ? 2 : 0));
      if (enemy.modifier === 'volatile') {
        for (const tag of ['enemy', 'player'])
          spawnPulse(ctx.engine, at, death.from ?? -1, 4.5, enemy.damage * 2, 0.8, tag, 'fire');
      }
      s.dirty = true;
    }
    if (s.phase !== 'combat') return;
    s.elapsed += ctx.time.dt;
    if (s.pending > 0 && ctx.time.elapsed >= s.spawnAt && w.query(RiftEnemy).length < 22) {
      const index = s.plan.budget - s.pending;
      spawnEnemy(ctx.engine, index, s.plan.boss && s.wave === s.plan.waves && s.pending === 1);
      s.pending--;
      s.spawnAt = ctx.time.elapsed + 0.65;
    }
    const alive = w.query(RiftEnemy, Health).some((e) => !w.get(e, Health)!.dead);
    if (alive || s.pending > 0) return;
    if (s.wave < s.plan.waves) {
      s.wave++;
      s.pending = s.plan.budget;
      s.spawnAt = ctx.time.elapsed + 2.2;
      notifyRun(
        s,
        `WAVE ${s.wave} / ${s.plan.waves}${s.plan.boss && s.wave === s.plan.waves ? ' · WARDEN INBOUND' : ''}`,
        ctx.time.elapsed,
      );
      return;
    }
    s.phase = 'cleared';
    s.profile.bestDepth = Math.max(s.profile.bestDepth, s.plan.depth);
    s.profile.depth = Math.min(Number.MAX_SAFE_INTEGER, s.plan.depth + 1);
    const key = String(s.plan.depth);
    s.profile.bestTimes[key] = Math.min(s.profile.bestTimes[key] ?? Infinity, s.elapsed);
    // Keep save size bounded: retain the latest 100 depth records.
    const records = Object.keys(s.profile.bestTimes).sort((a, b) => Number(a) - Number(b));
    for (const old of records.slice(0, Math.max(0, records.length - 100))) delete s.profile.bestTimes[old];
    s.profile.gold += 35 + s.plan.depth * 10;
    s.reward = rollLoot(s.profile, s.catalog, s.plan.boss ? 3 : 2);
    if (s.profile.inventory.length < 40) s.profile.inventory.push(s.reward);
    else s.profile.gold += 50 + s.plan.depth * 5;
    const gate = w.named('exit-gate');
    if (gate !== undefined) w.get(gate, Model)!.tint = '';
    if (player !== undefined) {
      w.get(player, Health)!.current = w.get(player, Health)!.max;
      w.get(player, CombatStats)!.incoming = 0;
    }
    notifyRun(s, `RIFT SECURED · ${s.reward.name}`, ctx.time.elapsed);
    ctx.audio.music('calm');
    ctx.audio.play('pickup');
    s.store.save(s.profile);
    s.dirty = false;
  },
});
