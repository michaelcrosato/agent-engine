import { Quaternion, Vector3 } from 'three';
import { defineSystem } from '../core/defineSystem.ts';
import { Transform } from '../core/Transform.ts';
import { Model } from '../model/Model.ts';
import { PuppetKind } from '../model/Puppet.ts';
import { buildPuppet, disposePuppet } from './buildPuppet.ts';
import { RendererKey } from './Renderer.ts';
import { lerpPose, TransformHistoryKey } from './TransformHistory.ts';

const pos = new Vector3();
const rot = new Quaternion();

/** Builds Three objects for Model components and moves them to interpolated Transforms. */
export const RenderSyncSystem = defineSystem({
  name: 'RenderSyncSystem',
  doc: 'Creates/updates/removes scene objects for entities with Model + Transform.',
  phase: 'frame',
  order: -100,
  run(ctx) {
    const r = ctx.service(RendererKey);
    const hist = ctx.engine.tryService(TransformHistoryKey);
    const w = ctx.world;
    for (const [e, m] of r.models) {
      const model = w.get(e, Model);
      if (
        w.isAlive(e) &&
        model &&
        m.source === model &&
        m.tint === model.tint &&
        m.filterGroup === model.filterGroup
      )
        continue;
      r.scene.remove(m.inst.root);
      disposePuppet(m.inst);
      r.models.delete(e);
    }
    for (const e of w.query(Model, Transform)) {
      const model = w.get(e, Model)!;
      const t = w.get(e, Transform)!;
      let m = r.models.get(e);
      if (!m) {
        const parts = model.puppet ? ctx.content.get(PuppetKind, model.puppet).parts : model.parts;
        const look = r.look;
        const inst = buildPuppet(parts, {
          materials: r.materials,
          filterGroup: model.filterGroup,
          ...(model.tint ? { tint: model.tint } : {}),
          origin: t.pos,
          tileOf: (name) => look?.materials[name]?.tile ?? 2,
          where: model.puppet ? (ctx.content.entry(PuppetKind, model.puppet)?.file ?? '') : w.label(e),
        });
        inst.root.userData.entity = e;
        r.scene.add(inst.root);
        m = { inst, source: model, tint: model.tint, filterGroup: model.filterGroup };
        r.models.set(e, m);
      }
      const root = m.inst.root;
      lerpPose(hist, e, t, ctx.time.alpha, pos, rot);
      root.position.copy(pos);
      root.quaternion.copy(rot);
      root.scale.copy(t.scale);
      root.visible = model.visible;
    }
  },
});
