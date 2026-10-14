import { Vector3 } from 'three';
import {
  Animator,
  CameraRig,
  CharacterBody,
  defineSystem,
  ElementState,
  Health,
  Inventory,
  Model,
  spawnEffect,
  Transform,
  Traversal,
  viewRay,
} from '#engine/api.ts';
import { applyBuild, buildBonuses } from '../progression/applyBuild.ts';
import { sellValue } from '../progression/rollLoot.ts';
import { notifyRun, RunKey } from '../RunState.ts';
import { spawnPulse } from '../world/spawnPulse.ts';

export const RunnerSystem = defineSystem({
  name: 'RunnerSystem',
  doc: 'Nova and grenade abilities, loot attraction, town services and autosave.',
  phase: 'update',
  order: 20,
  run(ctx) {
    const s = ctx.service(RunKey);
    const w = ctx.world;
    const p = w.tagged('player')[0];
    if (p === undefined) return;
    const pos = w.get(p, Transform)!.pos;
    if (s.buildDirty) applyBuild(ctx.engine);
    const b = buildBonuses(ctx.engine, s.profile);
    const gearPower = s.profile.inventory.find((item) => item.id === s.profile.equipped.weapon)?.power ?? 1;
    s.pulse = Math.max(0, s.pulse - ctx.time.dt * (1 + b.cooldown));
    s.grenade = Math.max(0, s.grenade - ctx.time.dt * (1 + b.cooldown));
    s.profile.thirdPerson = w.get(p, CameraRig)!.mode === 'third';
    w.get(p, Inventory)!.ammo.bullets = 9999;
    if (s.phase === 'dead') return;
    if (s.phase === 'combat') {
      if (ctx.input.pressed('nova') && s.pulse <= 0) {
        s.pulse = 7;
        spawnPulse(
          ctx.engine,
          pos,
          p,
          7 * (1 + b.area),
          70 * gearPower * (1 + s.profile.level * 0.025),
          0.12,
          'enemy',
          'frost',
        );
        w.get(p, Animator)!.play = 'cast';
        w.get(p, Traversal)!.actionTime = 0.45;
        spawnEffect(ctx, 'rift-burst', pos.clone().add(new Vector3(0, 1, 0)));
        ctx.audio.play('fireball');
      }
      if (ctx.input.pressed('grenade') && s.grenade <= 0) {
        s.grenade = 5;
        const ray = viewRay(w, p);
        const hit = ctx.physics.raycast(ray.origin, ray.dir, 25, { exclude: p });
        const at = hit?.point ?? ray.origin.clone().addScaledVector(ray.dir, 18);
        const floor = ctx.physics.raycast(at.clone().add(new Vector3(0, 0.5, 0)), new Vector3(0, -1, 0), 40, {
          layers: ['world'],
        });
        at.y = floor?.point.y ?? 0;
        spawnPulse(
          ctx.engine,
          at,
          p,
          5 * (1 + b.area),
          100 * gearPower * (1 + s.profile.level * 0.025),
          0.45,
          'enemy',
          'fire',
        );
        w.get(p, Animator)!.play = 'cast';
        w.get(p, Traversal)!.actionTime = 0.45;
        ctx.audio.play('fireball', { pitch: 0.8 });
      }
      // Momentum rewards close passes; dash refreshes briefly after a clean kill through skill investment.
      if (w.get(p, ElementState)!.charged > 0)
        w.get(p, Traversal)!.cooldown = Math.max(0, w.get(p, Traversal)!.cooldown - ctx.time.dt * 0.5);
    }
    s.prompt = '';
    s.nearNpc = '';
    if (s.phase === 'town') {
      for (const npc of w.tagged('town-npc')) {
        if (w.get(npc, Transform)!.pos.distanceTo(pos) < 4.4) {
          s.nearNpc = w.nameOf(npc)!;
          s.prompt = `E · ${s.nearNpc === 'forge' ? 'Visit the forge' : s.nearNpc === 'vendor' ? 'Browse the exchange' : 'Open the archive'}`;
          if (ctx.input.pressed('use')) s.panel = s.nearNpc as 'forge' | 'vendor' | 'guide';
        }
      }
      const gate = w.named('gate');
      if (gate !== undefined && w.get(gate, Transform)!.pos.distanceTo(pos) < 6) {
        s.prompt = 'E · Enter the fracture';
        if (ctx.input.pressed('use')) ctx.engine.requestRoom('expedition');
      }
    } else if (s.phase === 'cleared') {
      s.prompt = 'E · Push deeper  /  Esc · Return to Lastlight';
      if (ctx.input.pressed('use')) ctx.engine.requestRoom('expedition');
    }
    for (const e of [...w.tagged('loot-item'), ...w.tagged('loot-gold')]) {
      const t = w.get(e, Transform)!;
      const d = t.pos.distanceTo(pos);
      const radius = 3.1 + b.magnet;
      if (d < radius + 3) {
        const to = pos
          .clone()
          .add(new Vector3(0, 0.6, 0))
          .sub(t.pos);
        t.pos.addScaledVector(to, Math.min(1, ctx.time.dt * 7));
      }
      if (d > 1.6) continue;
      const item = s.drops.get(e);
      if (item) {
        if (s.profile.inventory.length < 40) {
          s.profile.inventory.push(item);
          notifyRun(s, `${item.rarity.toUpperCase()} · ${item.name}  [I to equip]`, ctx.time.elapsed);
        } else {
          s.profile.gold += sellValue(item);
          notifyRun(s, 'Pack full · drop salvaged for gold', ctx.time.elapsed);
        }
        s.drops.delete(e);
      } else {
        const goldTag = w.tagsOf(e).find((tag) => tag.startsWith('gold:'));
        s.profile.gold += Number(goldTag?.slice(5) ?? 0);
      }
      w.destroy(e);
      s.dirty = true;
      ctx.audio.play('pickup', { volume: 0.3, pitch: item ? 1 : 1.5 });
    }
    if (pos.y < -12) {
      ctx.physics.teleport(p, new Vector3(0, 0.3, 20));
      w.get(p, CharacterBody)!.velocity.set(0, 0, 0);
    }
    if (s.dirty && ctx.time.elapsed >= s.saveAt) {
      s.store.save(s.profile);
      s.dirty = false;
      s.saveAt = ctx.time.elapsed + 5;
    }
    const model = w.get(p, Model)!;
    if (w.get(p, Health)!.dead) model.visible = true;
  },
});
