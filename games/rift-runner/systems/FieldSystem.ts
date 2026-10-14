import { Vector3 } from 'three';
import {
  CharacterBody,
  Died,
  defineSystem,
  ElementState,
  Health,
  Transform,
  Traversal,
} from '#engine/api.ts';
import { RunKey } from '../RunState.ts';
import { spawnPulse } from '../world/spawnPulse.ts';
import { RiftField } from './RiftField.ts';

export const FieldSystem = defineSystem({
  name: 'RiftFieldSystem',
  doc: 'Optional level tools affect the same physical and elemental state used by combat.',
  phase: 'late',
  order: -20,
  run(ctx) {
    const s = ctx.service(RunKey);
    const w = ctx.world;
    for (const died of ctx.events.read(Died)) {
      const f = w.get(died.entity, RiftField);
      if (!f || f.kind !== 'barrel' || f.spent) continue;
      f.spent = true;
      const at = w.get(died.entity, Transform)!.pos;
      for (const tag of ['player', 'enemy'])
        spawnPulse(ctx.engine, at, died.from ?? -1, 6, 85 * (1 + s.plan.depth * 0.12), 0.12, tag, 'fire');
      w.destroy(died.entity);
    }
    if (s.phase !== 'combat') return;
    for (const e of w.query(RiftField, Transform)) {
      const field = w.get(e, RiftField)!;
      const pos = w.get(e, Transform)!.pos;
      field.cooldown = Math.max(0, field.cooldown - ctx.time.dt);
      if (field.spent || field.kind === 'barrel') continue;
      for (const actor of w.query(CharacterBody, Health, Transform)) {
        if (w.get(actor, Health)!.dead) continue;
        const at = w.get(actor, Transform)!.pos;
        const distance = Math.hypot(pos.x - at.x, pos.z - at.z);
        if (distance > field.radius || Math.abs(pos.y - at.y) > 3) continue;
        const state = w.get(actor, ElementState) ?? w.add(actor, ElementState);
        const body = w.get(actor, CharacterBody)!;
        const isPlayer = w.hasTag(actor, 'player');
        if (field.kind === 'conduit') state.wet = 2;
        if (field.kind === 'chill') state.chill = 1;
        if (field.kind === 'overdrive') state.charged = 6;
        if (field.kind === 'vortex' && distance > 1 && !isPlayer) {
          const d = new Vector3(pos.x - at.x, 0, pos.z - at.z).normalize().multiplyScalar(ctx.time.dt * 8);
          ctx.physics.moveCharacter(actor, d);
        }
        if (field.kind === 'echo' && isPlayer) {
          s.pulse = Math.max(0, s.pulse - ctx.time.dt * 2.5);
          s.grenade = Math.max(0, s.grenade - ctx.time.dt * 2.5);
        }
        if (field.cooldown > 0) continue;
        if (field.kind === 'launch') {
          body.velocity.y = 16;
          field.cooldown = 0.75;
          if (isPlayer) {
            w.get(actor, Traversal)!.jumpsUsed = 0;
            ctx.audio.play('jump', { pitch: 0.7 });
          }
        }
        if (field.kind === 'rift' && isPlayer) {
          const other = w
            .query(RiftField, Transform)
            .find((other) => other !== e && w.get(other, RiftField)!.kind === 'rift');
          if (other === undefined) continue;
          const dest = w
            .get(other, Transform)!
            .pos.clone()
            .add(new Vector3(0, 0.3, 3));
          ctx.physics.teleport(actor, dest);
          body.velocity.set(0, 0, 0);
          field.cooldown = 2;
          w.get(other, RiftField)!.cooldown = 2;
          ctx.audio.play('jump', { pitch: 1.5 });
        }
      }
    }
  },
});
