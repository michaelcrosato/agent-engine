import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  type Mesh,
  NeutralToneMapping,
  NoToneMapping,
  type Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { ContentStore } from '../content/ContentStore.ts';
import { defineService } from '../core/defineService.ts';
import { EngineError } from '../core/EngineError.ts';
import type { Log } from '../core/Log.ts';
import type { Entity } from '../core/World.ts';
import type { PuppetInstance } from './buildPuppet.ts';
import { createSky } from './createSky.ts';
import type { Look } from './Look.ts';
import { MaterialLibrary } from './MaterialLibrary.ts';
import { PostStackKind } from './PostStack.ts';
import { type BuiltComposer, buildComposer } from './post/buildComposer.ts';
import { resolveLook } from './resolveLook.ts';
import { TextureCache } from './TextureCache.ts';

const TONE = {
  aces: ACESFilmicToneMapping,
  agx: AgXToneMapping,
  neutral: NeutralToneMapping,
  none: NoToneMapping,
};

/** A rendered entity: its built model and the component data it was built from. */
export type RenderedModel = { inst: PuppetInstance; source: object; tint: string };

/**
 * The Three.js side of the engine (browser only), available to frame systems as
 * `ctx.service(RendererKey)`. Owns the scene, camera, look, materials, and post stack.
 */
export class Renderer {
  readonly three: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(75, 16 / 9, 0.05, 1500);
  readonly textures: TextureCache;
  readonly materials: MaterialLibrary;
  /** Entity → built model (managed by RenderSyncSystem). */
  readonly models = new Map<Entity, RenderedModel>();
  /** Entity → light object (managed by LightSystem). */
  readonly lights = new Map<Entity, Object3D>();
  look: Look | undefined;
  lookId = '';
  /** Changes whenever material definitions are replaced, including variants of the same look. */
  paletteVersion = 0;
  /** When set, the camera ignores CameraRigs and looks from `pos` at `target` (screenshots, editor). */
  cameraOverride: { pos: Vector3; target: Vector3 } | undefined;
  private sky: Mesh | undefined;
  private readonly sun = new DirectionalLight();
  private readonly hemi = new HemisphereLight();
  private post: BuiltComposer | undefined;
  private readonly content: ContentStore;
  private renderScale = 1;
  private time = 0;

  constructor(canvas: HTMLCanvasElement, content: ContentStore, log: Log) {
    this.content = content;
    this.three = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.three.shadowMap.enabled = true;
    this.three.info.autoReset = false; // count whole frames (all post passes), reset in render()
    this.three.shadowMap.type = PCFShadowMap;
    this.textures = new TextureCache(content);
    this.materials = new MaterialLibrary(this.textures, log);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target, this.hemi, this.camera);
  }

  /** Applies a look: sky, fog, lights, exposure, tone mapping, material palette, post stack. */
  applyLook(id: string): void {
    const look = resolveLook(this.content, id);
    this.look = look;
    this.lookId = id;
    if (this.sky) {
      this.scene.remove(this.sky);
      this.sky.geometry.dispose();
      const materials = Array.isArray(this.sky.material) ? this.sky.material : [this.sky.material];
      for (const material of materials) material.dispose();
    }
    this.sky = createSky(look.sky);
    this.scene.add(this.sky);
    this.scene.background = new Color(look.sky.horizon);
    this.scene.fog = look.fog.far > 0 ? new Fog(look.fog.color, look.fog.near, look.fog.far) : null;
    this.hemi.color.set(look.ambient.sky);
    this.hemi.groundColor.set(look.ambient.ground);
    this.hemi.intensity = look.ambient.intensity;
    this.sun.color.set(look.sun.color);
    this.sun.intensity = look.sun.intensity;
    this.sun.castShadow = look.sun.shadows;
    this.three.toneMapping = TONE[look.toneMapping];
    this.three.toneMappingExposure = look.exposure;
    this.renderScale = look.renderScale;
    this.three.domElement.style.imageRendering = look.renderScale < 1 ? 'pixelated' : '';
    this.materials.setPalette(look.materials);
    this.paletteVersion++;
    for (const m of this.models.values()) m.source = {};
    this.rebuildPost();
    this.resize(this.three.domElement.clientWidth || 1280, this.three.domElement.clientHeight || 720);
  }

  /** Runtime palette variants for procedural worlds, without mutating source look assets. */
  recolor(colors: Record<string, string>): void {
    if (!this.look) return;
    const palette = structuredClone(this.look.materials);
    for (const [name, color] of Object.entries(colors)) {
      if (!palette[name] || !/^#[0-9a-f]{6}$/i.test(color))
        throw new EngineError({
          code: 'PALETTE_COLOR_INVALID',
          what: `Cannot recolor material "${name}" to "${color}"`,
          fix: 'Use an existing material name and a six-digit hex color.',
        });
      palette[name]!.color = color;
      if (palette[name]!.emissive !== '#000000') palette[name]!.emissive = color;
    }
    this.materials.setPalette(palette);
    this.paletteVersion++;
    for (const model of this.models.values()) model.source = {};
  }

  /** Aims the sun's shadow frustum to cover a box (call when a room loads). */
  fitShadows(center: Vector3, radius: number): void {
    const dir = new Vector3(...(this.look?.sun.dir ?? [-0.4, -1, -0.3])).normalize();
    this.sun.target.position.copy(center);
    this.sun.position.copy(center).addScaledVector(dir, -radius * 2);
    const cam = this.sun.shadow.camera;
    cam.left = -radius;
    cam.right = radius;
    cam.top = radius;
    cam.bottom = -radius;
    cam.near = 0.5;
    cam.far = radius * 4;
    cam.updateProjectionMatrix();
  }

  private rebuildPost(): void {
    // EffectComposer releases its buffers, but individual passes own additional GPU resources.
    for (const pass of this.post?.composer.passes ?? []) pass.dispose();
    this.post?.composer.dispose();
    const id = this.look?.post ?? '';
    const passes =
      id && this.content.has(PostStackKind, id) ? this.content.get(PostStackKind, id).passes : [];
    this.post = buildComposer(this.three, this.scene, this.camera, passes);
  }

  resize(w: number, h: number): void {
    const ratio = (globalThis.devicePixelRatio ?? 1) * this.renderScale;
    this.three.setPixelRatio(ratio);
    this.three.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    if (this.post) {
      this.post.composer.setPixelRatio(ratio);
      this.post.composer.setSize(w, h);
      for (const p of this.post.sized) p.uniforms.resolution!.value = [w * ratio, h * ratio];
    }
  }

  render(dt: number): void {
    this.three.info.reset();
    this.time += dt;
    if (this.sky) this.sky.position.copy(this.camera.position);
    if (this.post) {
      for (const p of this.post.timed) p.uniforms.time!.value = this.time;
      this.post.composer.render(dt);
    } else this.three.render(this.scene, this.camera);
  }
}

export const RendererKey = defineService<Renderer>(
  'renderer',
  'Three.js scene, camera, and materials (browser only).',
);
