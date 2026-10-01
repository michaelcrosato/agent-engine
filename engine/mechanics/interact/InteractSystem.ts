import { defineEvent } from '../../core/defineEvent.ts';
import { defineSystem } from '../../core/defineSystem.ts';
import type { Entity } from '../../core/World.ts';
import { runSignalSpec } from '../../logic/SignalQueue.ts';
import { viewRay } from '../../render/viewRay.ts';
import { Interactable } from './Interactable.ts';
import { Interactor } from './Interactor.ts';

export const Used = defineEvent<{ user: Entity; target: Entity }>('Used', 'An Interactable was used.');

/** Finds the Interactable each Interactor looks at and uses it on the use action. */
export const InteractSystem = defineSystem({
  name: 'InteractSystem',
  doc: 'Focus + use for Interactor/Interactable (buttons, levers, terminals).',
  phase: 'update',
  run(ctx) {
    const w = ctx.world;
    for (const e of w.query(Interactor)) {
      const it = w.get(e, Interactor)!;
      const ray = viewRay(w, e);
      const hit = ctx.physics.raycast(ray.origin, ray.dir, it.reach, { exclude: e, sensors: true });
      const target =
        hit && w.get(hit.entity, Interactable) && hit.distance <= w.get(hit.entity, Interactable)!.range
          ? hit.entity
          : -1;
      const ia = target >= 0 ? w.get(target, Interactable)! : undefined;
      const usable = !!ia && !(ia.once && ia.uses > 0);
      it.focus = usable ? target : -1;
      it.prompt = usable ? ia!.prompt : '';
      if (!usable || !ctx.input.pressed(it.action)) continue;
      if (ctx.time.elapsed - ia!.lastUse < ia!.cooldown) continue;
      ia!.uses++;
      ia!.lastUse = ctx.time.elapsed;
      if (ia!.sound) ctx.audio.play(ia!.sound, { at: hit!.point });
      for (const spec of ia!.onUse) runSignalSpec(ctx, spec, target);
      ctx.events.emit(Used, { user: e, target });
    }
  },
});
