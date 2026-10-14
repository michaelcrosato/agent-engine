import {
  Color,
  DepthTexture,
  DoubleSide,
  Mesh,
  NearestFilter,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  ShaderMaterial,
  UnsignedIntType,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import type { VisualFilter } from '../VisualFilter.ts';
import { visualFilterShader } from './visualFilterShader.ts';

/** One surface capture gives occlusion-correct categories, silhouette depth and geometric creases. */
export class VisualFilterPass extends Pass {
  private readonly surface = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthTexture: new DepthTexture(1, 1, UnsignedIntType),
  });
  private readonly normals = new ShaderMaterial({
    name: 'Filter surface categories',
    uniforms: { subject: { value: 0 } },
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vNormal;
      uniform float subject;
      void main() {
        vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
        gl_FragColor = vec4(n * 0.5 + 0.5, subject);
      }`,
  });
  private readonly material: ShaderMaterial;
  private readonly quad: FullScreenQuad;
  private readonly scene: Scene;
  private readonly camera: PerspectiveCamera;
  private readonly clearColor = new Color();

  constructor(scene: Scene, camera: PerspectiveCamera, filter: VisualFilter) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.normals.onBeforeRender = (_renderer, _scene, _camera, _geometry, object) => {
      this.normals.uniforms.subject!.value = object.userData.filterGroup === 'subject' ? 1 : 0;
      this.normals.uniformsNeedUpdate = true;
    };
    this.material = new ShaderMaterial({
      name: 'Selective visual filter',
      ...visualFilterShader,
      uniforms: {
        tDiffuse: { value: null },
        tSurface: { value: this.surface.texture },
        tDepth: { value: this.surface.depthTexture },
        resolution: { value: new Vector2(1, 1) },
        cameraNear: { value: camera.near },
        cameraFar: { value: camera.far },
        pixelRatio: { value: 1 },
        style: { value: { none: 0, cel: 1, graphic: 2, vivid: 3 }[filter.style] },
        scope: { value: { scene: 0, environment: 1, subjects: 2 }[filter.scope] },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  override setSize(width: number, height: number): void {
    this.surface.setSize(width, height);
    this.material.uniforms.resolution!.value.set(width, height);
  }

  override render(renderer: WebGLRenderer, write: WebGLRenderTarget, read: WebGLRenderTarget): void {
    const scene = this.scene;
    const hidden: Object3D[] = [];
    const background = scene.background,
      override = scene.overrideMaterial;
    const target = renderer.getRenderTarget(),
      autoClear = renderer.autoClear;
    const shadows = renderer.shadowMap.autoUpdate,
      alpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clearColor);
    // Transparent effects and text keep their soft edges; sky is the environment clear value.
    scene.traverse((object) => {
      if (!object.visible || !('material' in object)) return;
      const materials = object instanceof Mesh ? [object.material].flat() : [];
      if (!materials.length || !object.userData.filterGroup || materials.some((m) => m.transparent)) {
        hidden.push(object);
        object.visible = false;
      }
    });
    try {
      scene.background = null;
      scene.overrideMaterial = this.normals;
      renderer.shadowMap.autoUpdate = false;
      renderer.autoClear = true;
      renderer.setClearColor(0x8080ff, 0);
      renderer.setRenderTarget(this.surface);
      renderer.render(scene, this.camera);
    } finally {
      for (const object of hidden) object.visible = true;
      scene.background = background;
      scene.overrideMaterial = override;
      renderer.shadowMap.autoUpdate = shadows;
      renderer.autoClear = autoClear;
      renderer.setClearColor(this.clearColor, alpha);
      renderer.setRenderTarget(target);
    }
    this.material.uniforms.tDiffuse!.value = read.texture;
    this.material.uniforms.cameraNear!.value = this.camera.near;
    this.material.uniforms.cameraFar!.value = this.camera.far;
    this.material.uniforms.pixelRatio!.value = renderer.getPixelRatio();
    renderer.setRenderTarget(this.renderToScreen ? null : write);
    this.quad.render(renderer);
  }

  override dispose(): void {
    this.surface.dispose();
    this.normals.dispose();
    this.material.dispose();
    this.quad.dispose();
  }
}
