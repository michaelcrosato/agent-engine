import { Vector3 } from 'three';
import { defineSystem } from '../core/defineSystem.ts';
import { RendererKey } from '../render/Renderer.ts';
import { WebAudioOut } from './WebAudioOut.ts';

const fwd = new Vector3();

/** Moves the WebAudio listener to the render camera and updates following voices. */
export const AudioListenerSystem = defineSystem({
  name: 'AudioListenerSystem',
  doc: 'Keeps 3D audio in sync with the camera (browser only).',
  phase: 'frame',
  order: 60,
  run(ctx) {
    const out = ctx.audio;
    const r = ctx.engine.tryService(RendererKey);
    if (!(out instanceof WebAudioOut) || !r) return;
    r.camera.getWorldDirection(fwd);
    out.update({ pos: r.camera.position, forward: fwd });
  },
});
