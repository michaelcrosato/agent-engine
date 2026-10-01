import type { Ctx } from '../../core/Ctx.ts';
import type { ComponentData } from '../../core/defineComponent.ts';
import { defineSystem } from '../../core/defineSystem.ts';
import type { Entity } from '../../core/World.ts';
import { Message } from '../../logic/Message.ts';
import { Model } from '../../model/Model.ts';
import { TriggerEntered } from '../../physics/physicsEvents.ts';
import { heal, hp } from '../health/applyDamage.ts';
import { Health } from '../health/Health.ts';
import { Inventory } from './Inventory.ts';
import { Pickup } from './Pickup.ts';
import { PickedUp } from './pickupEvents.ts';

type P = ComponentData<typeof Pickup>;

/** Applies the pickup to the picker; returns false if it can't be used now (e.g. full health). */
function apply(ctx: Ctx, p: P, picker: Entity): boolean {
  const h = ctx.world.get(picker, Health);
  const inv = ctx.world.get(picker, Inventory);
  switch (p.kind) {
    case 'health':
      return !!h && hp(h) < h.max && heal(ctx, picker, p.amount) > 0;
    case 'armor':
      if (!h || h.armor >= 200) return false;
      h.armor = Math.min(200, h.armor + p.amount);
      return true;
    case 'ammo':
      if (!inv) return false;
      inv.ammo[p.item] = (inv.ammo[p.item] ?? 0) + p.amount;
      return true;
    case 'key':
      if (!inv) return false;
      if (!inv.keys.includes(p.item)) inv.keys.push(p.item);
      return true;
    case 'item':
      if (!inv) return false;
      inv.items[p.item] = (inv.items[p.item] ?? 0) + p.amount;
      return true;
    default:
      return true;
  }
}

/** Collects pickups on sensor contact and respawns them later if configured. */
export const PickupSystem = defineSystem({
  name: 'PickupSystem',
  doc: 'Applies Pickup components when the player touches them; handles respawn.',
  phase: 'late',
  run(ctx) {
    const w = ctx.world;
    for (const ev of ctx.events.read(TriggerEntered)) {
      const p = w.get(ev.trigger, Pickup);
      if (!p || p.taken || !w.hasTag(ev.other, 'player')) continue;
      if (!apply(ctx, p, ev.other)) continue;
      ctx.events.emit(PickedUp, {
        picker: ev.other,
        pickup: ev.trigger,
        kind: p.kind,
        item: p.item,
        amount: p.amount,
      });
      if (p.sound) ctx.audio.play(p.sound);
      if (p.message) {
        ctx.events.emit(Message, {
          text: p.message.replace('{amount}', String(p.amount)).replace('{item}', p.item),
          seconds: 2,
        });
      }
      if (p.respawn > 0) {
        p.taken = true;
        p.respawnAt = ctx.time.elapsed + p.respawn;
        const m = w.get(ev.trigger, Model);
        if (m) m.visible = false;
      } else w.destroy(ev.trigger);
    }
    for (const e of w.query(Pickup)) {
      const p = w.get(e, Pickup)!;
      if (!p.taken || ctx.time.elapsed < p.respawnAt) continue;
      p.taken = false;
      const m = w.get(e, Model);
      if (m) m.visible = true;
    }
  },
});
