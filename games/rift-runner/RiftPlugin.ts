import { Color, Vector3 } from 'three';
import {
  CharacterBody,
  DomInput,
  definePlugin,
  ElementState,
  Health,
  RendererKey,
  Respawn,
  type SaveStorage,
  SaveStore,
  Transform,
  Traversal,
} from '#engine/api.ts';
import { applyBuild } from './progression/applyBuild.ts';
import { ExpeditionCatalog } from './progression/ExpeditionCatalog.ts';
import { newProfile, ProfileSchema } from './progression/Profile.ts';
import { SkillCatalog } from './progression/SkillCatalog.ts';
import { RunKey } from './RunState.ts';
import { EnemySystem } from './systems/EnemySystem.ts';
import { ExpeditionSystem } from './systems/ExpeditionSystem.ts';
import { FieldSystem } from './systems/FieldSystem.ts';
import { RiftEnemy } from './systems/RiftEnemy.ts';
import { RiftField } from './systems/RiftField.ts';
import { RunnerSystem } from './systems/RunnerSystem.ts';
import { RiftHudSystem } from './ui/RiftHudSystem.ts';
import { buildArena } from './world/buildArena.ts';
import { buildTown } from './world/buildTown.ts';
import { levelPlan } from './world/levelPlan.ts';

export const RiftPlugin = definePlugin({
  name: 'rift-runner',
  doc: 'The signature endless loot-combat expedition game.',
  requires: ['action', 'combat'],
  components: [RiftEnemy, RiftField],
  contentKinds: [ExpeditionCatalog, SkillCatalog],
  systems: [EnemySystem, FieldSystem, RunnerSystem, ExpeditionSystem, RiftHudSystem],
  setup(engine) {
    let storage: SaveStorage | undefined;
    if (engine.host && !engine.host.muted) {
      try {
        storage = localStorage;
      } catch {
        /* Session-only storage is supported. */
      }
    }
    const store = new SaveStore('agent-engine:rift-runner:v1', 1, ProfileSchema, storage);
    const profile = store.load(() => {
      const p = newProfile();
      p.seed = engine.rng.int(1, 4294967295);
      return p;
    });
    // Repair semantic references after content changes; never let a stale equipped id break boot.
    if (!profile.inventory.some((i) => i.slot === 'weapon'))
      profile.inventory.unshift(newProfile().inventory[0]!);
    profile.inventory = profile.inventory.slice(0, 40);
    for (const slot of ['weapon', 'core', 'charm'] as const) {
      if (!profile.inventory.some((i) => i.id === profile.equipped[slot] && i.slot === slot))
        profile.equipped[slot] = profile.inventory.find((i) => i.slot === slot)?.id ?? '';
    }
    const catalog = engine.content.get(ExpeditionCatalog, 'core');
    engine.provide(RunKey, {
      profile,
      store,
      catalog,
      plan: levelPlan(catalog, profile.depth, profile.seed),
      phase: 'town',
      wave: 0,
      pending: 0,
      spawnAt: 0,
      elapsed: 0,
      kills: 0,
      pulse: 0,
      grenade: 0,
      deathAt: 0,
      saveAt: 0,
      panel: '',
      notice: '',
      noticeUntil: 0,
      dirty: false,
      buildDirty: false,
      prompt: '',
      nearNpc: '',
      drops: new Map(),
      damageNumbers: [],
      hitUntil: 0,
      hurtUntil: 0,
      started: !engine.host || !!engine.host.muted,
      reward: undefined,
      spawnPoints: [],
      fieldTimer: 0,
    });
  },
  roomReady(engine) {
    const s = engine.service(RunKey),
      w = engine.world;
    const town = engine.roomId === 'start';
    s.phase = town ? 'town' : 'combat';
    s.panel = '';
    s.elapsed = 0;
    s.kills = 0;
    s.wave = 0;
    s.pending = 0;
    s.spawnAt = 0;
    s.pulse = 0;
    s.grenade = 0;
    s.reward = undefined;
    s.drops.clear();
    s.damageNumbers = [];
    s.plan = levelPlan(s.catalog, s.profile.depth, s.profile.seed);
    if (town) buildTown(engine);
    else buildArena(engine);
    const player = w.tagged('player')[0]!;
    w.remove(player, Respawn);
    const h = w.get(player, Health)!;
    h.dead = false;
    h.invulnerable = false;
    w.attach(player, ElementState, ElementState.create());
    w.attach(player, Traversal, Traversal.create());
    w.get(player, CharacterBody)!.velocity.set(0, 0, 0);
    applyBuild(engine, true);
    const r = engine.tryService(RendererKey);
    if (r) {
      r.setVisualFilter(s.profile.visualFilter);
      r.applyLook(town ? 'haven' : s.plan.biome.look);
      if (!town && s.plan.depth > s.catalog.lessons.length) {
        const ground = new Color(s.plan.color).lerp(new Color('#bbc5bd'), 0.8);
        r.recolor({ cyan: s.plan.color, ground: `#${ground.getHexString()}` });
      }
      r.fitShadows(new Vector3(0, 0, 0), 35);
    }
    engine.physics.sync();
    engine.physics.teleport(player, w.get(player, Transform)!.pos);
    s.store.save(s.profile);
    if (engine.inputSource instanceof DomInput) engine.inputSource.sensitivity = s.profile.sensitivity;
  },
});
