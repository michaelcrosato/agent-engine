/** Working buffers for texture generation. All channels are 0..1 floats, row-major. */
export class TexCanvas {
  readonly size: number;
  readonly r: Float32Array;
  readonly g: Float32Array;
  readonly b: Float32Array;
  /** Height for the normal map; 0.5 is the base surface. */
  readonly height: Float32Array;
  readonly rough: Float32Array;
  /** Emission strength (glowing lines, screens). */
  readonly glow: Float32Array;

  constructor(size: number, roughness: number) {
    const n = size * size;
    this.size = size;
    this.r = new Float32Array(n).fill(0.5);
    this.g = new Float32Array(n).fill(0.5);
    this.b = new Float32Array(n).fill(0.5);
    this.height = new Float32Array(n).fill(0.5);
    this.rough = new Float32Array(n).fill(roughness);
    this.glow = new Float32Array(n);
  }

  /** Calls fn(index, u, v) for every pixel, with u, v at pixel centers in [0, 1). */
  each(fn: (i: number, u: number, v: number) => void): void {
    const s = this.size;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) fn(y * s + x, (x + 0.5) / s, (y + 0.5) / s);
  }
}
