import { experienceCost, experienceCurve, levelsFromExperience, VisualFilterSchema, z } from '#engine/api.ts';

export const statNames = [
  'damage',
  'health',
  'speed',
  'critical',
  'leech',
  'chains',
  'detonate',
  'cooldown',
  'magnet',
  'armor',
  'area',
  'regen',
] as const;
export const LootItemSchema = z
  .object({
    id: z.string().max(100),
    name: z.string().max(100),
    slot: z.enum(['weapon', 'core', 'charm']),
    base: z.enum(['carbine', 'scattergun', 'railgun', 'pulse', 'core', 'charm']),
    rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
    element: z.enum(['kinetic', 'fire', 'frost', 'shock']),
    level: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    power: z.number().positive(),
    affixes: z
      .array(z.object({ name: z.string().max(80), stat: z.enum(statNames), value: z.number().min(0) }))
      .max(6),
    upgrades: z.number().int().min(0).max(5).default(0),
  })
  .refine(
    (item) => (item.slot === 'weapon' ? !['core', 'charm'].includes(item.base) : item.base === item.slot),
    {
      message: 'Item base must belong to its equipment slot',
    },
  );
export type LootItem = z.infer<typeof LootItemSchema>;

export const DifficultySchema = z.object({
  playerDamage: z.number().min(0.1).max(5).default(1),
  playerHealth: z.number().min(0.1).max(5).default(1),
  playerSpeed: z.number().min(0.25).max(3).default(1),
  enemyDamage: z.number().min(0.1).max(5).default(1),
  enemyHealth: z.number().min(0.1).max(5).default(1),
  enemySpeed: z.number().min(0.25).max(3).default(1),
});
export type Difficulty = z.infer<typeof DifficultySchema>;

export const ProfileSchema = z.object({
  level: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(1),
  xp: z.number().min(0).default(0),
  gold: z.number().min(0).default(0),
  skillPoints: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(2),
  skills: z.record(z.string(), z.number().int().min(0).max(5)).default({}),
  mastery: z
    .object({
      force: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
      survival: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
      flow: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
    })
    .prefault({}),
  depth: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(1),
  bestDepth: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
  kills: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
  seed: z.number().int().min(0).max(4294967295).default(7381),
  serial: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(1),
  inventory: z.array(LootItemSchema).max(40).default([]),
  equipped: z
    .object({ weapon: z.string(), core: z.string(), charm: z.string() })
    .default({ weapon: '', core: '', charm: '' }),
  difficulty: DifficultySchema.prefault({}),
  bestTimes: z.record(z.string(), z.number().nonnegative()).default({}),
  volume: z.number().min(0).max(1).default(0.45),
  sensitivity: z.number().min(0.04).max(0.4).default(0.12),
  thirdPerson: z.boolean().default(true),
  visualFilter: VisualFilterSchema.prefault({ style: 'cel', scope: 'scene' }),
});
export type Profile = z.infer<typeof ProfileSchema>;

export function newProfile(): Profile {
  const p = ProfileSchema.parse({});
  const starter: LootItem = {
    id: 'starter',
    name: 'Outrider Carbine',
    slot: 'weapon',
    base: 'carbine',
    rarity: 'common',
    element: 'kinetic',
    level: 1,
    power: 1,
    affixes: [],
    upgrades: 0,
  };
  p.inventory.push(starter);
  p.equipped.weapon = starter.id;
  return p;
}

export function xpRequired(level: number): number {
  return experienceCurve(level);
}

/** Award all earned levels in logarithmic time; content has no authored level ceiling. */
export function grantXp(p: Profile, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  p.xp += amount;
  const gained = levelsFromExperience(p.level, p.xp);
  p.xp = Math.max(0, p.xp - experienceCost(p.level, gained));
  p.level += gained;
  p.skillPoints = Math.min(Number.MAX_SAFE_INTEGER, p.skillPoints + gained);
  return gained;
}
