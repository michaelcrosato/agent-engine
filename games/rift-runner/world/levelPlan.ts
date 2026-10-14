import { ContentGrammar, hashString, Rng } from '#engine/api.ts';
import type { ExpeditionData } from '../progression/ExpeditionCatalog.ts';

export type LevelPlan = {
  depth: number;
  name: string;
  hint: string;
  mechanics: string[];
  biome: ExpeditionData['biomes'][number];
  layout: string;
  seed: number;
  waves: number;
  budget: number;
  boss: boolean;
  color: string;
};

export function levelPlan(catalog: ExpeditionData, depth: number, seed: number): LevelPlan {
  const grammar = new ContentGrammar(`${seed}:${depth}`);
  const tokens = grammar.compose([
    { name: 'biome', choices: catalog.biomes },
    { name: 'layout', choices: catalog.layouts },
  ]);
  const biome = catalog.biomes.find((b) => b.id === tokens.biome)!;
  const lesson = catalog.lessons[depth - 1];
  const rng = new Rng(hashString(`${seed}:${depth}:mechanics`));
  const unlocked = catalog.lessons.slice(0, Math.min(catalog.lessons.length, depth));
  const mechanics = lesson ? [lesson.id] : [];
  const combinations = lesson
    ? depth > 3
      ? 1
      : 0
    : 2 + Math.min(2, Math.floor(Math.log2(depth / catalog.lessons.length)));
  for (let i = 0; i < combinations && unlocked.length; i++) {
    const pick = unlocked.splice(rng.int(0, unlocked.length - 1), 1)[0]!;
    if (!mechanics.includes(pick.id)) mechanics.push(pick.id);
  }
  const label =
    lesson?.name ??
    mechanics.map((id) => catalog.lessons.find((l) => l.id === id)!.name.split(' ')[0]).join(' + ');
  const hue = hashString(`${seed}:${depth}:palette`) % 360;
  const channel = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  const color =
    '#' +
    [0, 120, 240].map((shift) => channel(150 + 85 * Math.cos(((hue + shift) * Math.PI) / 180))).join('');
  return {
    depth,
    name: label,
    hint: lesson?.hint ?? 'Combine familiar tools. Chain reactions, keep moving, push deeper.',
    mechanics,
    biome,
    layout: tokens.layout!,
    seed: hashString(`${seed}:${depth}:map`),
    waves: depth < 3 ? 2 : 3,
    budget: 7 + Math.min(14, Math.floor(depth * 0.85)),
    boss: depth % 3 === 0,
    color: lesson ? biome.color : color,
  };
}
