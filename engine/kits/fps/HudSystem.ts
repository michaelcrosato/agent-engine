import { defineService } from '../../core/defineService.ts';
import { defineSystem } from '../../core/defineSystem.ts';
import { DomInput } from '../../input/DomInput.ts';
import { Message } from '../../logic/Message.ts';
import { hp } from '../../mechanics/health/applyDamage.ts';
import { Health } from '../../mechanics/health/Health.ts';
import { Damaged } from '../../mechanics/health/healthEvents.ts';
import { Interactor } from '../../mechanics/interact/Interactor.ts';
import { Inventory } from '../../mechanics/pickups/Inventory.ts';
import { Scored } from '../../mechanics/targets/TargetSystem.ts';
import { Arsenal } from './Arsenal.ts';
import { FpsHud } from './FpsHud.ts';
import { magOf } from './WeaponSystem.ts';
import { weaponData } from './weaponData.ts';

export const HudKey = defineService<{ hud: FpsHud; score: number | undefined }>(
  'fpsHud',
  'FPS HUD overlay (browser only).',
);

/** Feeds the FPS HUD from the player's components and recent events (browser only). */
export const HudSystem = defineSystem({
  name: 'HudSystem',
  doc: 'Updates the first-person HUD: health, ammo, keys, prompts, messages, hit/damage feedback.',
  phase: 'frame',
  order: 70,
  run(ctx) {
    const host = ctx.engine.host;
    const messages = ctx.events.read(Message);
    const damaged = ctx.events.read(Damaged);
    const scored = ctx.events.read(Scored);
    if (!host) return;
    let st = ctx.engine.tryService(HudKey);
    if (!st) {
      st = { hud: new FpsHud(host.overlay), score: undefined };
      ctx.engine.provide(HudKey, st);
    }
    const now = performance.now() / 1000;
    const w = ctx.world;
    const p = w.tagged('player')[0];
    for (const m of messages) st.hud.message(m.text, m.seconds, now);
    for (const s of scored) st.score = (st.score ?? 0) + s.points;
    for (const d of damaged) {
      if (d.entity === p) st.hud.damageFlash(Math.min(0.8, d.amount / 40 + 0.15));
      else if (d.from === p && d.kind !== 'hazard') st.hud.hitMarker();
    }
    if (p === undefined) return;
    const h = w.get(p, Health);
    const a = w.get(p, Arsenal);
    const inv = w.get(p, Inventory);
    const id = a?.weapons[a.current];
    const wd = id ? weaponData(ctx.content, id) : undefined;
    let ammo = '';
    if (a && id && wd) {
      const reserve = wd.ammo ? (inv?.ammo[wd.ammo] ?? 0) : Infinity;
      if (!wd.ammo) ammo = '∞';
      else if (wd.magazine > 0) ammo = `${magOf(a, id, wd)} / ${reserve}`;
      else ammo = String(reserve);
    }
    st.hud.update(
      {
        health: h ? hp(h) : 100,
        maxHealth: h?.max ?? 100,
        armor: h?.armor ?? 0,
        weapon: a && a.reloading > 0 ? `${wd?.name ?? ''} (reloading)` : (wd?.name ?? ''),
        ammo,
        keys: inv?.keys ?? [],
        prompt: w.get(p, Interactor)?.prompt ?? '',
        score: st.score,
        dead: !!h?.dead,
        showPlay: ctx.engine.inputSource instanceof DomInput && !ctx.engine.inputSource.locked,
      },
      now,
      ctx.time.frameDt,
    );
  },
});
