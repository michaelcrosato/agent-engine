import { Damaged, defineService, defineSystem, Transform } from '#engine/api.ts';
import { RunKey } from '../RunState.ts';
import { RiftHud } from './RiftHud.ts';
import { uiFormat } from './uiFormat.ts';

const RiftHudKey = defineService<RiftHud>('riftHud', 'Rift Runner browser interface.');
export const RiftHudSystem = defineSystem({
  name: 'RiftHudSystem',
  doc: 'Readable combat feedback, progression menus and playtest controls.',
  phase: 'frame',
  order: 70,
  run(ctx) {
    if (!ctx.engine.host) return;
    let ui = ctx.engine.tryService(RiftHudKey);
    if (!ui) {
      ui = new RiftHud(ctx.engine);
      ctx.engine.provide(RiftHudKey, ui);
    }
    const s = ctx.service(RunKey),
      w = ctx.world,
      player = w.tagged('player')[0];
    for (const d of ctx.events.read(Damaged)) {
      if (d.entity === player) s.hurtUntil = ctx.time.elapsed + 0.3;
      else if (d.from === player) {
        s.hitUntil = ctx.time.elapsed + 0.12;
        const pos = d.point ?? w.get(d.entity, Transform)?.pos;
        if (pos)
          s.damageNumbers.push({
            at: [pos.x, pos.y + 1, pos.z],
            text: `${uiFormat(d.amount)}${d.critical ? '!' : ''}`,
            color: d.critical ? '#ffdf99' : '#dcfff0',
            until: ctx.time.elapsed + 0.85,
          });
      }
    }
    ui.frame();
  },
});
