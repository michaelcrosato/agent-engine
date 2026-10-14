import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import {
  AreaPulse,
  CharacterBody,
  CombatStats,
  Health,
  hp,
  Model,
  Projectile,
  Transform,
} from '#engine/api.ts';
import { type NodePlaytest, playtest } from '#engine/testing.ts';
import { applyDifficulty } from '../../progression/applyDifficulty.ts';
import { profileActions } from '../../progression/profileActions.ts';
import { RunKey } from '../../RunState.ts';
import { RiftEnemy } from '../../systems/RiftEnemy.ts';
import { spawnEnemy } from '../../world/spawnEnemy.ts';

function closest(t: NodePlaytest): number | undefined {
  return t.engine.world
    .query(RiftEnemy, Health)
    .filter((e) => !t.get(e, Health).dead)
    .sort((a, b) => t.pos(a).distanceTo(t.pos(t.player)) - t.pos(b).distanceTo(t.pos(t.player)))[0];
}

describe('Rift Runner expedition', () => {
  test('a firing player clears both waves, earns XP and gear, then continues into the next lesson', async () => {
    const t = await playtest('rift-runner', 'expedition', { seed: 7 });
    const s = t.engine.service(RunKey);
    t.get(t.player, Health).invulnerable = true;
    const end = t.seconds + 120;
    while (s.phase === 'combat' && t.seconds < end) {
      const enemy = closest(t);
      if (enemy === undefined) {
        t.wait(0.25);
        continue;
      }
      t.lookAt(enemy, t.get(enemy, Model).puppet === 'rift-stalker' ? 0.85 : 1.2);
      t.hold('fire', 0.12);
      if (!t.engine.world.isAlive(enemy)) continue;
      if (t.pos(enemy).distanceTo(t.pos(t.player)) < 7) t.hold('moveBack', 0.08).release('moveBack');
      if (s.pulse <= 0 && t.pos(enemy).distanceTo(t.pos(t.player)) < 7) t.press('nova');
    }
    t.release('fire');
    expect(s.phase, `wave ${s.wave}; ${t.engine.world.query(RiftEnemy).length} survivors`).toBe('cleared');
    expect(s.kills).toBe(s.plan.budget * s.plan.waves);
    expect(s.profile.level).toBeGreaterThan(1);
    expect(s.profile.gold).toBeGreaterThan(0);
    expect(s.profile.inventory.length).toBeGreaterThan(1);
    expect(s.profile.depth).toBe(2);
    const reward = s.reward!;
    expect(profileActions(t.engine, 'equip', reward.id)).toBe(true);
    t.press('use').tick();
    expect(t.engine.roomId).toBe('expedition');
    expect(s.phase).toBe('combat');
    expect(s.plan.mechanics).toEqual(['barrel']);
    expect(t.get(t.player, CombatStats).incoming).toBeGreaterThan(0);
    expect(s.profile.equipped[reward.slot]).toBe(reward.id);
  }, 30000);

  test('enemies punish a stationary player, and a town return revives the same character', async () => {
    const t = await playtest('rift-runner', 'expedition');
    const s = t.engine.service(RunKey);
    expect(t.until(() => s.phase === 'dead', 55)).toBe(true);
    const player = t.player;
    t.engine.loadRoom('start');
    expect(t.player).toBe(player);
    expect(s.phase).toBe('town');
    expect(t.get(player, Health).dead).toBe(false);
    expect(hp(t.get(player, Health))).toBe(t.get(player, Health).max);
    expect(t.get(player, CharacterBody).velocity.length()).toBe(0);
  }, 15000);

  test('all six difficulty controls apply to live combatants without healing their health fraction', async () => {
    const t = await playtest('rift-runner', 'expedition');
    t.wait(3);
    const e = t.engine.world.query(RiftEnemy)[0]!;
    const h = t.get(e, Health),
      before = h.max;
    h.current = h.max / 2;
    const me = t.get(t.player, Health);
    me.current = me.max / 2;
    expect(
      applyDifficulty(t.engine, {
        enemyHealth: 2,
        enemyDamage: 3,
        enemySpeed: 1.5,
        playerHealth: 2,
        playerDamage: 2.5,
        playerSpeed: 1.2,
      }),
    ).toBe(true);
    expect(h.max).toBe(before * 2);
    expect(h.current).toBe(h.max / 2);
    expect(me.current).toBe(me.max / 2);
    expect(t.get(e, CombatStats).damage).toBe(3);
    expect(t.get(e, CombatStats).movement).toBe(1.5);
    expect(t.get(t.player, CombatStats).damage).toBe(2.5);
    expect(t.get(t.player, CombatStats).movement).toBe(1.2);
    expect(applyDifficulty(t.engine, { enemyHealth: -1 })).toBe(false);
  });

  test('deep boss expeditions remain finite and reuse bounded world populations', async () => {
    const t = await playtest('rift-runner', 'start');
    const s = t.engine.service(RunKey);
    s.profile.depth = 30000;
    t.engine.loadRoom('expedition');
    t.get(t.player, Health).invulnerable = true;
    t.wait(20);
    expect(s.plan.boss).toBe(true);
    expect(t.engine.world.query(RiftEnemy).length).toBeLessThanOrEqual(22);
    for (const e of t.engine.world.query(RiftEnemy, Health, Transform)) {
      expect(Number.isFinite(t.get(e, Health).max)).toBe(true);
      expect(t.pos(e).toArray().every(Number.isFinite)).toBe(true);
    }
    expect(t.engine.world.size).toBeLessThan(200);
  }, 15000);

  test('each lesson leaves a flat combat route that does not require its mechanic', async () => {
    const t = await playtest('rift-runner', 'start');
    const s = t.engine.service(RunKey);
    for (let depth = 1; depth <= 8; depth++) {
      s.profile.depth = depth;
      t.engine.loadRoom('expedition');
      t.get(t.player, Health).invulnerable = true;
      t.hold('moveForward', 5).release('moveForward');
      expect(t.pos(t.player).z, s.plan.name).toBeLessThan(-14);
      expect(t.pos(t.player).y).toBeLessThan(0.5);
    }
  }, 15000);

  test('a boss executes every configured telegraphed phase and launches physical projectiles', async () => {
    const t = await playtest('rift-runner', 'expedition');
    const s = t.engine.service(RunKey);
    t.get(t.player, Health).invulnerable = true;
    t.engine.physics.teleport(t.player, new Vector3(0, 0.2, 2));
    const boss = spawnEnemy(t.engine, 1, true);
    t.engine.physics.sync();
    t.engine.physics.teleport(boss, new Vector3(0, 0.2, -4));
    const b = t.get(boss, RiftEnemy);
    b.patterns = ['shot', 'strike', 'nova'];
    const phases = new Set<string>();
    let projectile = false,
      pulse = false;
    for (let i = 0; i < 720; i++) {
      t.tick();
      if (b.windup > 0) phases.add(b.attack);
      projectile ||= t.engine.world.query(Projectile).some((e) => t.get(e, Projectile).owner === boss);
      pulse ||= t.engine.world.query(AreaPulse).some((e) => t.get(e, AreaPulse).owner === boss);
    }
    expect([...phases].sort()).toEqual(['nova', 'shot', 'strike']);
    expect(projectile).toBe(true);
    expect(pulse).toBe(true);
    expect(s.phase).toBe('combat');
  }, 15000);
});
