import { expect, test } from 'vitest';
import { ContentGrammar } from './ContentGrammar.ts';

test('grammar is deterministic, respects compatibility and isolates unrelated slots', () => {
  const grammar = new ContentGrammar(42);
  const biome = {
    name: 'biome',
    choices: [
      { id: 'ash', tags: ['hot'] },
      { id: 'ice', tags: ['cold'] },
    ],
  };
  const monster = {
    name: 'monster',
    choices: [
      { id: 'ember', requires: ['hot'] },
      { id: 'frost', requires: ['cold'] },
    ],
  };
  const plan = grammar.compose([biome, monster]);
  expect(grammar.compose([biome, monster])).toEqual(plan);
  expect(plan.monster).toBe(plan.biome === 'ash' ? 'ember' : 'frost');
  expect(grammar.compose([{ name: 'decoration', choices: [{ id: 'rock' }] }, biome, monster]).biome).toBe(
    plan.biome,
  );
  expect(() => grammar.compose([{ name: 'broken', choices: [{ id: 'no', weight: 0 }] }])).toThrow(
    'GRAMMAR_EMPTY',
  );
});
