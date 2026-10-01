import { defineSystem } from '../core/defineSystem.ts';
import { Model } from '../model/Model.ts';
import { PuppetKind } from '../model/Puppet.ts';
import { RendererKey } from '../render/Renderer.ts';
import { Animator } from './Animator.ts';
import { accumulate, applyPose } from './applyPose.ts';
import { ClipKind } from './Clip.ts';

/** Plays Animator clips on built puppets with crossfades (browser only, frame phase). */
export const AnimatorSystem = defineSystem({
  name: 'AnimatorSystem',
  doc: 'Samples clips for Animator components and poses puppet joints.',
  phase: 'frame',
  run(ctx) {
    const r = ctx.service(RendererKey);
    const dt = ctx.time.frameDt;
    for (const e of ctx.world.query(Animator, Model)) {
      const anim = ctx.world.get(e, Animator)!;
      const model = ctx.world.get(e, Model)!;
      const inst = r.models.get(e)?.inst;
      if (!inst) continue;
      const roles = model.puppet ? ctx.content.get(PuppetKind, model.puppet).clips : {};
      const clipId = roles[anim.play] ?? anim.play;
      if (clipId !== anim.current) {
        anim.prev = anim.current;
        anim.prevTime = anim.time;
        anim.current = clipId;
        anim.time = 0;
        anim.blend = anim.fade > 0 && anim.prev ? 0 : 1;
      }
      anim.time += dt * anim.speed;
      anim.prevTime += dt * anim.speed;
      anim.blend = anim.fade > 0 ? Math.min(1, anim.blend + dt / anim.fade) : 1;
      const acc = new Map();
      const has = (id: string) => !!id && ctx.content.has(ClipKind, id);
      if (anim.current && !has(anim.current)) {
        ctx.log.once(
          `clip:${anim.current}`,
          `Clip "${anim.current}" not found for ${ctx.world.label(e)} (Animator.play = "${anim.play}"). Add data/clips/${anim.current}.json or a puppet clips role.`,
        );
      }
      if (has(anim.prev) && anim.blend < 1)
        accumulate(acc, ctx.content.get(ClipKind, anim.prev), anim.prevTime, 1 - anim.blend);
      if (has(anim.current)) accumulate(acc, ctx.content.get(ClipKind, anim.current), anim.time, anim.blend);
      applyPose(inst, acc);
    }
  },
});
