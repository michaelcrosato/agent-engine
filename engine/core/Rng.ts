/**
 * Small seeded PRNG (sfc32). Use `ctx.rng` for all gameplay randomness so headless runs
 * are reproducible on the same machine. `fork(label)` gives an independent stream.
 */
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed = 1) {
    this.a = 0x9e3779b9;
    this.b = 0x243f6a88;
    this.c = 0xb7e15162;
    this.d = seed >>> 0;
    for (let i = 0; i < 12; i++) this.next();
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Uniform float in [-amount, amount). */
  spread(amount: number): number {
    return (this.next() * 2 - 1) * amount;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** Independent stream derived from this one and a label (stable for the same label). */
  fork(label = ''): Rng {
    let h = 2166136261;
    for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 16777619);
    return new Rng((h ^ Math.floor(this.next() * 4294967296)) >>> 0);
  }
}

/** Stable 32-bit hash of a string (FNV-1a). Handy for seeding per-id generators. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
