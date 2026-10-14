import { describe, expect, test } from 'vitest';
import { playtest } from '#engine/testing.ts';
import { RunKey } from '../RunState.ts';
import { levelPlan } from '../world/levelPlan.ts';
import { grantXp, LootItemSchema, newProfile, ProfileSchema, xpRequired } from './Profile.ts';
import { profileActions } from './profileActions.ts';
import { rollLoot } from './rollLoot.ts';

describe('progression and procedural vocabulary', () => {
  test('introduces exactly one new mechanic at each authored depth, then only recombines known ones', async () => {
    const t = await playtest('rift-runner', 'start');
    const s = t.engine.service(RunKey),
      seen = new Set<string>();
    for (let d = 1; d <= s.catalog.lessons.length; d++) {
      const plan = levelPlan(s.catalog, d, 7);
      expect(plan.mechanics.filter((m) => !seen.has(m))).toEqual([s.catalog.lessons[d - 1]!.id]);
      for (const m of plan.mechanics) seen.add(m);
    }
    const names = new Set<string>();
    for (const depth of [9, 10, 11, 12, 30, 100, 1000, 1000000, Number.MAX_SAFE_INTEGER]) {
      const plan = levelPlan(s.catalog, depth, 7);
      expect(plan).toEqual(levelPlan(s.catalog, depth, 7));
      expect(plan.mechanics.every((m) => seen.has(m))).toBe(true);
      expect(plan.budget).toBeLessThanOrEqual(21);
      expect(plan.color).toMatch(/^#[0-9a-f]{6}$/);
      names.add(`${plan.biome.id}/${plan.layout}/${plan.mechanics.join(',')}`);
    }
    expect(names.size).toBeGreaterThan(5);
  });
  test('loot, prerequisite spending, equipping and gold transactions share the same validated profile', async () => {
    const t = await playtest('rift-runner', 'start');
    const s = t.engine.service(RunKey);
    expect(profileActions(t.engine, 'skill', 'plating')).toBe(false);
    expect(profileActions(t.engine, 'skill', 'hull')).toBe(true);
    expect(profileActions(t.engine, 'skill', 'plating')).toBe(true);
    expect(profileActions(t.engine, 'skill', 'stride')).toBe(false);
    profileActions(t.engine, 'respec');
    expect(s.profile.skillPoints).toBe(2);
    expect(profileActions(t.engine, 'buy')).toBe(false);
    s.profile.gold = 500;
    expect(profileActions(t.engine, 'buy')).toBe(true);
    const item = s.profile.inventory[1]!;
    expect(profileActions(t.engine, 'equip', item.id)).toBe(true);
    expect(profileActions(t.engine, 'salvage', item.id)).toBe(false);
    const same = structuredClone(s.profile);
    expect(rollLoot(s.profile, s.catalog)).toEqual(rollLoot(same, s.catalog));
    s.profile.depth = 1000000;
    expect(Number.isFinite(rollLoot(s.profile, s.catalog).power)).toBe(true);
  });
  test('large XP rewards grant every earned point and retain the remainder', () => {
    const p = newProfile();
    const amount = xpRequired(1) + xpRequired(2) + 17;
    expect(grantXp(p, amount)).toBe(2);
    expect(p.level).toBe(3);
    expect(p.xp).toBe(17);
    expect(p.skillPoints).toBe(4);
  });

  test('generated loot remains saveable at early and extreme depths, with integral chain counts', async () => {
    const t = await playtest('rift-runner', 'start');
    const { catalog } = t.engine.service(RunKey);
    const p = newProfile();
    const rarities = new Set<string>();
    let weakStarter = false;
    for (const depth of [1, 2, 10000, Number.MAX_SAFE_INTEGER]) {
      p.depth = depth;
      for (let i = 0; i < 256; i++) {
        const item = rollLoot(p, catalog);
        expect(LootItemSchema.safeParse(item).success).toBe(true);
        rarities.add(item.rarity);
        weakStarter ||= item.power < 1;
        for (const a of item.affixes) if (a.stat === 'chains') expect(Number.isInteger(a.value)).toBe(true);
      }
    }
    expect(weakStarter).toBe(true);
    expect(rarities.size).toBe(5);
    expect(ProfileSchema.safeParse(p).success).toBe(true);
  });

  test('mastery is gated by level, spends real points, and refunds exactly through the town service', async () => {
    const t = await playtest('rift-runner', 'start');
    const { profile } = t.engine.service(RunKey);
    expect(profileActions(t.engine, 'mastery', 'force')).toBe(false);
    profile.level = 25;
    expect(profileActions(t.engine, 'mastery', 'force')).toBe(true);
    expect(profileActions(t.engine, 'mastery', 'survival')).toBe(true);
    expect(profileActions(t.engine, 'mastery', 'flow')).toBe(false);
    expect(profile.skillPoints).toBe(0);
    expect(profile.mastery.force).toBe(1);
    expect(profileActions(t.engine, 'respec')).toBe(true);
    expect(profile.skillPoints).toBe(2);
    expect(profile.mastery).toEqual({ force: 0, survival: 0, flow: 0 });
  });
});
