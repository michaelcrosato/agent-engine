import { Vector3 } from 'three';
import { definePlugin } from '../core/definePlugin.ts';
import { TextureKind } from '../gen/texture/TextureRecipe.ts';
import { Model } from '../model/Model.ts';
import { PuppetKind } from '../model/Puppet.ts';
import { CameraRig } from './CameraRig.ts';
import { CameraSystem } from './CameraSystem.ts';
import { Label } from './Label.ts';
import { LabelSystem } from './LabelSystem.ts';
import { Light } from './Light.ts';
import { LightSignalSystem } from './LightSignalSystem.ts';
import { LightSystem } from './LightSystem.ts';
import { LookKind } from './Look.ts';
import { PostStackKind } from './PostStack.ts';
import { Renderer, RendererKey } from './Renderer.ts';
import { RenderSyncSystem } from './RenderSyncSystem.ts';
import { RenderSystem } from './RenderSystem.ts';
import { TransformHistoryKey, TransformHistorySystem } from './TransformHistory.ts';

/**
 * Three.js rendering: models (puppets and inline parts), lights, camera rigs, looks, textures,
 * and post-processing. Components and content kinds register everywhere; drawing happens only
 * in the browser (frame phase).
 */
export const RenderPlugin = definePlugin({
  name: 'render',
  doc: 'Renders Model, Light, and CameraRig components with the room look (browser only).',
  components: [Model, Light, CameraRig, Label],
  systems: [
    TransformHistorySystem,
    LightSignalSystem,
    RenderSyncSystem,
    LightSystem,
    LabelSystem,
    CameraSystem,
    RenderSystem,
  ],
  contentKinds: [PuppetKind, LookKind, PostStackKind, TextureKind],
  setup(engine) {
    if (engine.mode !== 'browser' || !engine.host) return;
    engine.provide(RendererKey, new Renderer(engine.host.canvas, engine.content, engine.log));
    engine.provide(TransformHistoryKey, new Map());
  },
  roomReady(engine, room) {
    const r = engine.tryService(RendererKey);
    if (!r) return;
    if (r.lookId !== room.look) r.applyLook(room.look);
    const g = engine.grid;
    if (g) {
      const w = g.cols * g.cell;
      const d = g.rows * g.cell;
      r.fitShadows(new Vector3(w / 2, 0, d / 2), Math.max(w, d) * 0.75 + 4);
    } else r.fitShadows(new Vector3(0, 0, 0), 40);
  },
});
