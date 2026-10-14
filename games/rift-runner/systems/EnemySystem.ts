import { Vector3 } from 'three';
import {
  Animator,
  CharacterBody,
  CombatStats,
  defineSystem,
  ElementState,
  Health,
  hp,
  Projectile,
  Transform,
  yawQuat,
  yawToward,
} from '#engine/api.ts';
import { RunKey } from '../RunState.ts';
import { spawnPulse } from '../world/spawnPulse.ts';
import { RiftEnemy } from './RiftEnemy.ts';

export const EnemySystem = defineSystem({
  name: 'RiftEnemySystem',
  doc: 'Composable flanking, charging, ranged and orbital AI, with committed telegraphs and boss phases.',
  phase: 'update',
  order: 5,
  run(ctx) {
    const s = ctx.service(RunKey);
    if (s.phase !== 'combat') return;
    const w = ctx.world;
    const player = w.tagged('player')[0];
    if (player === undefined || w.get(player, Health)?.dead) return;
    const pt = w.get(player, Transform)!;
    for (const e of w.query(RiftEnemy, Transform, CharacterBody)) {
      const b = w.get(e, RiftEnemy)!;
      const h = w.get(e, Health)!;
      if (h.dead) continue;
      const t = w.get(e, Transform)!;
      const cb = w.get(e, CharacterBody)!;
      const dt = ctx.time.dt;
      const distance = t.pos.distanceTo(pt.pos);
      const aim = pt.pos.clone().sub(t.pos);
      aim.y = 0;
      aim.normalize();
      t.rot.copy(yawQuat(yawToward(aim)));
      const rage = b.boss && hp(h) < h.max * 0.5 ? 1.35 : 1;
      b.cooldown = Math.max(0, b.cooldown - dt * rage);
      let moving = false;
      if (b.windup > 0) {
        b.windup -= dt;
        if (b.windup <= 0 && b.attack === 'shot') {
          const origin = t.pos.clone().add(new Vector3(0, b.boss ? 2.5 : 1.2, 0));
          const direction = b.aim
            .clone()
            .add(new Vector3(0, 0.9, 0))
            .sub(origin)
            .normalize();
          for (let i = 0; i < (b.boss ? 5 : 1); i++) {
            const dir = direction.clone().applyAxisAngle(new Vector3(0, 1, 0), (i - (b.boss ? 2 : 0)) * 0.12);
            const shot = ctx.spawn('rift-bolt', { pos: origin.clone().addScaledVector(dir, 1) });
            w.get(shot, Transform)!.rot.setFromUnitVectors(new Vector3(0, 0, -1), dir);
            const p = w.get(shot, Projectile)!;
            p.owner = e;
            p.damage = b.damage;
            p.speed = (b.boss ? 23 : 18) * s.profile.difficulty.enemySpeed;
          }
          ctx.audio.play('enemy-shot', { at: origin, volume: 0.5 });
        }
      } else {
        const ranged = b.behavior === 'gunner' || b.behavior === 'orbiter';
        const attackRange = b.boss ? 45 : ranged ? 32 : b.behavior === 'charger' ? 10 : 2.6;
        const sight = ctx.physics.lineOfSight(
          t.pos.clone().add(new Vector3(0, 1.1, 0)),
          pt.pos.clone().add(new Vector3(0, 1, 0)),
          { layers: ['world'] },
        );
        if (b.cooldown <= 0 && distance < attackRange && sight) {
          b.aim.copy(pt.pos);
          b.phase++;
          b.attack = b.boss
            ? (b.patterns[(b.phase - 1) % b.patterns.length] ?? 'shot')
            : ranged
              ? 'shot'
              : 'strike';
          const windup = b.boss ? 1.05 : b.behavior === 'charger' ? 0.95 : ranged ? 0.7 : 0.52;
          b.windup = windup;
          b.cooldown = (b.boss ? 2.6 : ranged ? 2 : 1.45) / Math.min(2, s.profile.difficulty.enemySpeed);
          if (b.attack === 'strike') {
            const radius = b.boss ? 4.5 : b.behavior === 'charger' ? 3 : 2.2;
            spawnPulse(
              ctx.engine,
              b.aim,
              e,
              radius,
              b.damage,
              windup,
              'player',
              w.get(e, CombatStats)!.element,
            );
          } else if (b.attack === 'nova') {
            for (let i = 0; i < 5; i++) {
              const at =
                i === 0
                  ? pt.pos.clone()
                  : t.pos
                      .clone()
                      .add(new Vector3(Math.cos((i * Math.PI) / 2) * 7, 0, Math.sin((i * Math.PI) / 2) * 7));
              spawnPulse(ctx.engine, at, e, 4, b.damage * 1.2, windup + i * 0.15, 'player', 'fire');
            }
          }
        } else {
          const move = aim.clone();
          if (ranged && distance < 9) move.negate();
          else if (ranged && distance < 20 && sight) {
            move.set(aim.z, 0, -aim.x).multiplyScalar(e % 2 ? 1 : -1);
          }
          // Local obstacle avoidance complements open, guaranteed-connected generated arenas.
          const origin = t.pos.clone().add(new Vector3(0, 0.6, 0));
          if (ctx.physics.raycast(origin, move, 1.4, { layers: ['world'] })) {
            move.applyAxisAngle(new Vector3(0, 1, 0), e % 2 ? Math.PI / 2 : -Math.PI / 2);
          }
          const slow = (w.get(e, ElementState)?.chill ?? 0) > 0 ? 0.45 : 1;
          const speed = b.speed * w.get(e, CombatStats)!.movement * slow * rage;
          cb.velocity.x = move.x * speed;
          cb.velocity.z = move.z * speed;
          moving = true;
        }
      }
      if (!moving) {
        cb.velocity.x = 0;
        cb.velocity.z = 0;
      }
      cb.velocity.y = cb.grounded && cb.velocity.y <= 0 ? -2 : Math.max(-30, cb.velocity.y - dt * 20);
      ctx.physics.moveCharacter(e, cb.velocity.clone().multiplyScalar(dt));
      const anim = w.get(e, Animator);
      if (anim) {
        anim.play = b.windup > 0 ? 'attack' : moving ? 'walk' : 'idle';
        anim.speed = rage;
      }
    }
  },
});
