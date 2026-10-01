import { type Camera, type Scene, Vector2, type WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { PassData } from '../PostStack.ts';
import { displayShader } from './displayShaders.ts';

export type BuiltComposer = { composer: EffectComposer; timed: ShaderPass[]; sized: ShaderPass[] };

/**
 * Scene → [HDR passes: bloom] → OutputPass (tone map + sRGB) → [display passes in data order].
 * Returns the composer plus passes that need per-frame time / resolution updates.
 */
export function buildComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  passes: readonly PassData[],
): BuiltComposer {
  const size = renderer.getSize(new Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  for (const p of passes) {
    if (p.type === 'bloom')
      composer.addPass(new UnrealBloomPass(size.clone(), p.strength, p.radius, p.threshold));
  }
  composer.addPass(new OutputPass());
  const timed: ShaderPass[] = [];
  const sized: ShaderPass[] = [];
  for (const p of passes) {
    if (p.type === 'bloom') continue;
    if (p.type === 'fxaa') {
      composer.addPass(new FXAAPass());
      continue;
    }
    const shader = displayShader(p);
    if (!shader) continue;
    const pass = new ShaderPass(shader);
    composer.addPass(pass);
    timed.push(pass);
    sized.push(pass);
  }
  return { composer, timed, sized };
}
