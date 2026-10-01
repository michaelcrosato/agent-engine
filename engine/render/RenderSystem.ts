import { defineSystem } from '../core/defineSystem.ts';
import { RendererKey } from './Renderer.ts';

/** Draws the frame (scene + post stack). Runs last in the frame phase. */
export const RenderSystem = defineSystem({
  name: 'RenderSystem',
  doc: 'Renders the scene through the post-processing stack.',
  phase: 'frame',
  order: 1000,
  run(ctx) {
    ctx.service(RendererKey).render(ctx.time.frameDt);
  },
});
