import { defineService, type SaveStore } from '#engine/api.ts';
import type { ExpeditionData } from './progression/ExpeditionCatalog.ts';
import type { LootItem, Profile } from './progression/Profile.ts';
import type { LevelPlan } from './world/levelPlan.ts';

export type Panel = '' | 'menu' | 'skills' | 'inventory' | 'settings' | 'forge' | 'vendor' | 'guide';
export type RunState = {
  profile: Profile;
  store: SaveStore<Profile>;
  catalog: ExpeditionData;
  plan: LevelPlan;
  phase: 'town' | 'combat' | 'cleared' | 'dead';
  wave: number;
  pending: number;
  spawnAt: number;
  elapsed: number;
  kills: number;
  pulse: number;
  grenade: number;
  deathAt: number;
  saveAt: number;
  panel: Panel;
  notice: string;
  noticeUntil: number;
  dirty: boolean;
  buildDirty: boolean;
  prompt: string;
  nearNpc: string;
  drops: Map<number, LootItem>;
  damageNumbers: { at: [number, number, number]; text: string; color: string; until: number }[];
  hitUntil: number;
  hurtUntil: number;
  started: boolean;
  reward: LootItem | undefined;
  spawnPoints: [number, number, number][];
  fieldTimer: number;
};
export const RunKey = defineService<RunState>(
  'riftRun',
  'Rift Runner saved profile and bounded current expedition state.',
);

export function notifyRun(s: RunState, text: string, now: number): void {
  s.notice = text;
  s.noticeUntil = now + 4.5;
}
