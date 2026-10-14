import { type PerspectiveCamera, type Scene, Vector2, type WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { PassData } from '../PostStack.ts';
import type { VisualFilter } from '../VisualFilter.ts';
import { displayShader } from './displayShaders.ts';
import { VisualFilterPass } from './VisualFilterPass.ts';

export type BuiltComposer = { composer: EffectComposer; timed: ShaderPass[]; sized: ShaderPass[] };

/**
 * Scene → HDR bloom → tone map/sRGB → optional selective filter → authored display passes.
 * Returns the composer plus passes that need per-frame time / resolution updates.
 */
export function buildComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  passes: readonly PassData[],
  filter: VisualFilter = { style: 'none', scope: 'scene' },
): BuiltComposer {
  const size = renderer.getSize(new Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  for (const p of passes) {
    if (p.type === 'bloom')
      composer.addPass(new UnrealBloomPass(size.clone(), p.strength, p.radius, p.threshold));
  }
  composer.addPass(new OutputPass());
  if (filter.style !== 'none') composer.addPass(new VisualFilterPass(scene, camera, filter));
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
  if (filter.style !== 'none' && !passes.some((p) => p.type === 'fxaa')) composer.addPass(new FXAAPass());
  return { composer, timed, sized };
}
