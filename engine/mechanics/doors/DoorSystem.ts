import type { Ctx } from '../../core/Ctx.ts';
import type { ComponentData } from '../../core/defineComponent.ts';
import { defineSystem } from '../../core/defineSystem.ts';
import { Transform } from '../../core/Transform.ts';
import type { Entity } from '../../core/World.ts';
import { Message } from '../../logic/Message.ts';
import { Signal } from '../../logic/Signal.ts';
import { sendSignal } from '../../logic/sendSignal.ts';
import { Inventory } from '../pickups/Inventory.ts';
import { Door } from './Door.ts';

function setOpen(ctx: Ctx, e: Entity, d: ComponentData<typeof Door>, open: boolean): void {
  if (d.open === open) return;
  d.open = open;
  sendSignal(ctx, e, open ? 'open' : 'close', e);
  const sound = open ? d.openSound : d.closeSound;
  if (sound) ctx.audio.play(sound, { at: ctx.world.get(e, Transform)!.pos });
}

/** Opens/closes doors by player proximity, keys, and open/close/toggle/unlock/lock signals. */
export const DoorSystem = defineSystem({
  name: 'DoorSystem',
  doc: 'Door logic: proximity, keys, locked messages, and door signals.',
  phase: 'update',
  run(ctx) {
    const w = ctx.world;
    const signals = ctx.events.read(Signal);
    const players = w.tagged('player');
    for (const e of w.query(Door, Transform)) {
      const d = w.get(e, Door)!;
      const pos = w.get(e, Transform)!.pos;
      for (const s of signals) {
        if (s.target !== e || s.from === e) continue;
        if (s.action === 'unlock') d.key = '';
        else if (s.action === 'lock') d.key = d.key || 'locked';
        else if (s.action === 'open' || s.action === 'close' || s.action === 'toggle') {
          setOpen(ctx, e, d, s.action === 'toggle' ? !d.open : s.action === 'open');
          d.lastNear = ctx.time.elapsed + 3600;
        }
      }
      if (!d.auto) continue;
      let near = false;
      for (const p of players) {
        const pp = w.get(p, Transform)?.pos;
        if (!pp || Math.hypot(pp.x - pos.x, pp.z - pos.z) > d.radius || Math.abs(pp.y - pos.y) > 3) continue;
        const keys = w.get(p, Inventory)?.keys ?? [];
        if (d.key && !keys.includes(d.key)) {
          if (ctx.time.elapsed - d.lastNag > 3) {
            d.lastNag = ctx.time.elapsed;
            ctx.events.emit(Message, { text: d.lockedMessage.replace('{key}', d.key), seconds: 2 });
          }
          continue;
        }
        near = true;
      }
      if (near) {
        d.lastNear = ctx.time.elapsed;
        setOpen(ctx, e, d, true);
      } else if (d.open && d.closeDelay > 0 && ctx.time.elapsed - d.lastNear > d.closeDelay)
        setOpen(ctx, e, d, false);
    }
  },
});
