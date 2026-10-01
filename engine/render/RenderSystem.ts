import { defineSystem } from '../core/defineSystem.ts';
import { LookChanged } from '../logic/LookChanged.ts';
import { RendererKey } from './Renderer.ts';

/** Draws the frame (scene + post stack). Runs last in the frame phase. */
export const RenderSystem = defineSystem({
  name: 'RenderSystem',
  doc: 'Applies LookChanged requests and renders the scene through the post-processing stack.',
  phase: 'frame',
  order: 1000,
  run(ctx) {
    const r = ctx.service(RendererKey);
    for (const ev of ctx.events.read(LookChanged)) r.applyLook(ev.look);
    r.render(ctx.time.frameDt);
  },
});
