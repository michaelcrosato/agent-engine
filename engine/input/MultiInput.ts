import type { InputSample, InputSource } from './InputSource.ts';

/**
 * Several input sources at once (touch controls plus keyboard on a tablet): action values take
 * the strongest source, look deltas add up. Prompts and labels come from the first source.
 */
export class MultiInput implements InputSource {
  readonly sources: readonly InputSource[];

  constructor(sources: readonly InputSource[]) {
    this.sources = sources;
  }

  sample(): InputSample {
    const actions = new Map<string, number>();
    const look = { x: 0, y: 0 };
    for (const s of this.sources) {
      const one = s.sample();
      for (const [a, v] of one.actions) actions.set(a, Math.max(v, actions.get(a) ?? 0));
      look.x += one.look.x;
      look.y += one.look.y;
    }
    return { actions, look };
  }

  prompt(): string {
    return this.sources[0]?.prompt?.() ?? '';
  }

  actionLabel(action: string): string {
    return this.sources[0]?.actionLabel?.(action) ?? action;
  }
}
