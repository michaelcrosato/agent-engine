import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  Points,
  ShaderMaterial,
} from 'three';

const vertexShader = /* glsl */ `
attribute float size;
attribute vec4 tint;
varying vec4 vTint;
void main() {
  vTint = tint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * 900.0 / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const fragmentShader = /* glsl */ `
varying vec4 vTint;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vTint.rgb, vTint.a * smoothstep(0.5, 0.15, d));
}`;

/** Fixed-capacity GPU particle buffer (one draw call). Slots are recycled oldest-first. */
export class ParticlePool {
  readonly points: Points;
  readonly cap: number;
  readonly pos: Float32Array;
  readonly vel: Float32Array;
  readonly life: Float32Array;
  readonly maxLife: Float32Array;
  readonly size0: Float32Array;
  readonly sizeEnd: Float32Array;
  readonly c0: Float32Array;
  readonly c1: Float32Array;
  readonly grav: Float32Array;
  readonly drag: Float32Array;
  private readonly sizeAttr: BufferAttribute;
  private readonly tintAttr: BufferAttribute;
  private next = 0;

  constructor(cap: number, additive: boolean) {
    this.cap = cap;
    this.pos = new Float32Array(cap * 3);
    this.vel = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);
    this.maxLife = new Float32Array(cap);
    this.size0 = new Float32Array(cap);
    this.sizeEnd = new Float32Array(cap);
    this.c0 = new Float32Array(cap * 3);
    this.c1 = new Float32Array(cap * 3);
    this.grav = new Float32Array(cap);
    this.drag = new Float32Array(cap);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.sizeAttr = new BufferAttribute(new Float32Array(cap), 1);
    this.tintAttr = new BufferAttribute(new Float32Array(cap * 4), 4);
    g.setAttribute('size', this.sizeAttr);
    g.setAttribute('tint', this.tintAttr);
    const mat = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: additive ? AdditiveBlending : NormalBlending,
    });
    this.points = new Points(g, mat);
    this.points.frustumCulled = false;
  }

  /** Claims a slot and returns its index. */
  alloc(): number {
    const i = this.next;
    this.next = (this.next + 1) % this.cap;
    return i;
  }

  /** Integrates motion and refreshes GPU attributes. */
  update(dt: number): void {
    const size = this.sizeAttr.array as Float32Array;
    const tint = this.tintAttr.array as Float32Array;
    for (let i = 0; i < this.cap; i++) {
      if (this.life[i]! <= 0) {
        size[i] = 0;
        continue;
      }
      this.life[i] = this.life[i]! - dt;
      const t = 1 - Math.max(0, this.life[i]!) / this.maxLife[i]!;
      const k = Math.max(0, 1 - this.drag[i]! * dt);
      this.vel[i * 3] = this.vel[i * 3]! * k;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1]! * k + this.grav[i]! * dt;
      this.vel[i * 3 + 2] = this.vel[i * 3 + 2]! * k;
      for (let a = 0; a < 3; a++) {
        this.pos[i * 3 + a] = this.pos[i * 3 + a]! + this.vel[i * 3 + a]! * dt;
        tint[i * 4 + a] = this.c0[i * 3 + a]! + (this.c1[i * 3 + a]! - this.c0[i * 3 + a]!) * t;
      }
      tint[i * 4 + 3] = 1 - t * t;
      size[i] = this.size0[i]! * (1 + (this.sizeEnd[i]! - 1) * t);
    }
    this.points.geometry.getAttribute('position').needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.tintAttr.needsUpdate = true;
  }
}
