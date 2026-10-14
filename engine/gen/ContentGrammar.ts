import { EngineError } from '../core/EngineError.ts';
import { hashString, Rng } from '../core/Rng.ts';

export type GrammarToken = {
  id: string;
  weight?: number;
  tags?: string[];
  requires?: string[];
  excludes?: string[];
};
export type GrammarSlot = { name: string; choices: readonly GrammarToken[] };

/** Compose independently seeded slots. Tags let new pieces express compatibility without code. */
export class ContentGrammar {
  readonly seed: string;
  constructor(seed: number | string) {
    this.seed = String(seed);
  }

  compose(slots: readonly GrammarSlot[], initialTags: readonly string[] = []): Record<string, string> {
    const tags = new Set(initialTags);
    const result: Record<string, string> = {};
    for (const slot of slots) {
      const choices = slot.choices.filter(
        (c) =>
          (c.weight ?? 1) > 0 &&
          Number.isFinite(c.weight ?? 1) &&
          (c.requires ?? []).every((t) => tags.has(t)) &&
          !(c.excludes ?? []).some((t) => tags.has(t)),
      );
      if (!choices.length)
        throw new EngineError({
          code: 'GRAMMAR_EMPTY',
          what: `No compatible tokens for slot "${slot.name}"`,
          why: `Available tags: ${[...tags].join(', ') || 'none'}.`,
          fix: 'Add an unconditional fallback token, or correct the requires/excludes tags.',
        });
      const rng = new Rng(hashString(`${this.seed}/${slot.name}`));
      let cursor = rng.next() * choices.reduce((n, c) => n + (c.weight ?? 1), 0);
      let selected = choices[choices.length - 1]!;
      for (const choice of choices) {
        cursor -= choice.weight ?? 1;
        if (cursor <= 0) {
          selected = choice;
          break;
        }
      }
      result[slot.name] = selected.id;
      for (const tag of selected.tags ?? []) tags.add(tag);
    }
    return result;
  }
}
