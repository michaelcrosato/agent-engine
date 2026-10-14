import { hashString, Rng } from '#engine/api.ts';
import type { ExpeditionData } from './ExpeditionCatalog.ts';
import type { LootItem, Profile } from './Profile.ts';

export const rarityColors = {
  common: '#c3ced6',
  uncommon: '#93e5b3',
  rare: '#6cd4ff',
  epic: '#c3a0ff',
  legendary: '#ffcc7e',
};
const ranks = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
const names = {
  carbine: 'Carbine',
  scattergun: 'Scattergun',
  railgun: 'Longshot',
  pulse: 'Pulse Driver',
  core: 'Reactor',
  charm: 'Sigil',
};
const elements = ['kinetic', 'fire', 'frost', 'shock'] as const;
const prefixes = { kinetic: 'Iron', fire: 'Ember', frost: 'Rime', shock: 'Voltaic' };

/** Linear power and logarithmic rarity growth remain finite at every supported depth. */
export function depthPower(depth: number): number {
  return 1 + (Math.max(1, depth) - 1) * 0.16;
}

export function rollLoot(p: Profile, catalog: ExpeditionData, minimumRarity = 0): LootItem {
  const rng = new Rng(hashString(`${p.seed}/${p.depth}/${p.serial++}`));
  const roll = rng.next() + Math.min(0.12, Math.log2(p.depth + 1) * 0.012);
  const rank = Math.max(
    minimumRarity,
    roll > 0.97 ? 4 : roll > 0.86 ? 3 : roll > 0.6 ? 2 : roll > 0.3 ? 1 : 0,
  );
  const rarity = ranks[Math.min(4, rank)]!;
  const base = rng.pick(['carbine', 'scattergun', 'railgun', 'pulse', 'core', 'charm'] as const);
  const slot = base === 'core' || base === 'charm' ? base : 'weapon';
  const element = rank === 0 ? 'kinetic' : rng.pick(elements);
  const available = [...catalog.affixes];
  const affixes: LootItem['affixes'] = [];
  const count = Math.min(4, catalog.affixes.length, rank + (rank === 4 ? 1 : 0));
  for (let i = 0; i < count; i++) {
    const selected = available.splice(rng.int(0, available.length - 1), 1)[0]!;
    affixes.push({
      name: selected.name,
      stat: selected.stat,
      value:
        selected.stat === 'chains'
          ? rng.int(Math.ceil(selected.min), Math.floor(selected.max))
          : Number(rng.range(selected.min, selected.max).toFixed(3)),
    });
  }
  if (rank === 4) affixes.push({ name: 'Aftershock', stat: 'detonate', value: 0.35 });
  return {
    id: `drop-${p.serial}`,
    name: `${prefixes[element]} ${names[base]}${rank >= 3 ? ' of ' + rng.pick(['Ruin', 'Velocity', 'the Rift', 'Echoes']) : ''}`,
    slot,
    base,
    rarity,
    element,
    level: p.depth,
    power: depthPower(p.depth) * (1 + rank * 0.12) * rng.range(0.95, 1.08),
    affixes,
    upgrades: 0,
  };
}

export function sellValue(item: LootItem): number {
  return Math.round(12 + item.level * 4 + ranks.indexOf(item.rarity) * 15);
}
