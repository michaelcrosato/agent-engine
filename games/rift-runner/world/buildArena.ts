import { Vector3 } from 'three';
import { type Engine, Health, Light, Model, Motion, Rng, Transform } from '#engine/api.ts';
import { RunKey } from '../RunState.ts';
import { RiftField } from '../systems/RiftField.ts';
import { block, buildScenery, type PartInput, type Point, scenery, sign } from './buildScenery.ts';
import { dressArena } from './dressArena.ts';

const fieldNames: Record<string, string> = {
  launch: 'SLIPSTREAM',
  barrel: 'UNSTABLE REACTOR',
  conduit: 'CONDUCTOR',
  chill: 'FROST FIELD',
  overdrive: 'OVERDRIVE',
  vortex: 'GRAVITY WELL',
  echo: 'ECHO FORGE',
  rift: 'PHASE GATE',
};

function fieldProp(engine: Engine, kind: string, pos: Point, index: number): void {
  const parts: PartInput[] = [
    {
      shape: 'cylinder',
      size: [4.5, 0.035, 4.5],
      material: kind === 'chill' ? 'pad' : 'stone',
      segments: 24,
    },
    {
      shape: 'torus',
      size: [4.2, 4.2, 0.1],
      pos: [0, 0.055, 0],
      pivot: 'center',
      material: 'cyan',
      thickness: 0.04,
    },
  ];
  if (kind === 'barrel')
    parts.push(
      { shape: 'cylinder', size: [0.9, 1.6, 0.9], material: 'dark', pos: [0, 0.1, 0] },
      { shape: 'cylinder', size: [0.94, 0.7, 0.94], material: 'amber', pos: [0, 0.55, 0] },
    );
  else if (kind === 'overdrive' || kind === 'echo' || kind === 'vortex')
    parts.push(
      {
        shape: 'cone',
        size: [0.85, 1.5, 0.85],
        material: kind === 'overdrive' ? 'amber' : 'cyan',
        pos: [0, 0.8, 0],
        segments: 5,
      },
      {
        shape: 'cone',
        size: [0.85, 1, 0.85],
        material: 'brass',
        pos: [0, 0.8, 0],
        rot: [180, 0, 0],
        segments: 5,
      },
    );
  else if (kind === 'rift')
    parts.push({
      shape: 'torus',
      size: [3, 3, 0.4],
      material: 'cyan',
      pos: [0, 1.55, 0],
      thickness: 0.15,
      rot: [90, 0, 0],
      pivot: 'center',
    });
  else if (kind === 'launch') {
    for (let i = 0; i < 3; i++)
      parts.push({
        shape: 'wedge',
        size: [1.4, 0.14, 0.7],
        pos: [0, 0.06, -0.7 + i * 0.7],
        material: 'cyan',
      });
  } else
    parts.push({
      shape: 'cylinder',
      size: [4.1, 0.04, 4.1],
      material: 'pad',
      pos: [0, 0.04, 0],
      segments: 24,
    });
  const e = scenery(engine, `field-${kind}-${index}`, pos, parts);
  engine.world.add(e, RiftField, { kind: kind as 'launch', radius: kind === 'vortex' ? 7 : 2.5 });
  if (kind === 'barrel') {
    engine.world.add(e, Health, { max: 24, destroyOnDeath: false });
    // A barrel needs a hittable collider; keep the floor ring nonblocking.
    const body = engine.component('Body');
    engine.world.add(e, body, { size: [0.9, 1.7, 0.9], layer: 'prop' });
  }
  if (kind === 'overdrive' || kind === 'echo')
    engine.world.add(e, Light, { color: '#ffd69b', intensity: 5, range: 5, offset: [0, 1.5, 0] });
  sign(engine, `field-label-${index}`, [pos[0], 2.8, pos[2]], fieldNames[kind]!, '#beede0', 0.21);
}

export function buildArena(engine: Engine): void {
  const s = engine.service(RunKey);
  const plan = s.plan;
  const rng = new Rng(plan.seed);
  buildScenery(engine, false, plan.biome.material);
  dressArena(engine);
  s.spawnPoints = [
    [-20, 0.2, -17],
    [20, 0.2, -17],
    [-20, 0.2, 9],
    [20, 0.2, 9],
    [0, 0.2, -22],
  ];
  // Every layout preserves a wide, flat combat route around its optional elevation.
  const layout = s.catalog.layouts.find((entry) => entry.id === plan.layout)!;
  for (const [i, socket] of layout.terraces.entries()) {
    const pos: Point = [socket[0], 0, socket[1]];
    const height = i % 2 ? 1.4 : 2.4;
    block(engine, `terrace-${i}`, pos, [5, height, 5], 'stone');
    const ramp = scenery(
      engine,
      `ramp-${i}`,
      [pos[0], 0, pos[2] + 4.7],
      [{ shape: 'wedge', size: [3.4, height, 4.5], material: 'paving', uv: 'world' }],
    );
    engine.world.add(ramp, engine.component('Body'), { shape: 'wedge', size: [3.4, height, 4.5] });
    scenery(
      engine,
      `terrace-inlay-${i}`,
      [pos[0], height + 0.02, pos[2]],
      [
        { size: [4.8, 0.04, 0.12], material: 'cyan', pos: [0, 0, -2.35] },
        { size: [0.12, 0.04, 4.8], material: 'brass', pos: [-2.35, 0, 0] },
      ],
    );
  }
  for (let i = 0; i < 12; i++) {
    if (i === 0) continue; // Keep the starting shoulder-camera space open.
    const a = (i * Math.PI) / 6;
    scenery(
      engine,
      `obelisk-${i}`,
      [Math.sin(a) * 24, 0, Math.cos(a) * 24],
      [
        { size: [1.5, 5 + (i % 3), 1.8], material: 'stone', rot: rng.spread(8) },
        { size: [0.08, 3, 0.12], pos: [0, 1, -0.92], material: 'cyan' },
        { shape: 'cone', size: [2.1, 1.2, 2.1], pos: [0, 5 + (i % 3), 0], material: 'brass', segments: 4 },
      ],
      [1.5, 5 + (i % 3), 1.8],
    );
  }
  let index = 0;
  for (const [i, mechanic] of plan.mechanics.entries()) {
    const locations: Point[] =
      i === 0
        ? [
            [-5.5, 0.03, 5],
            [5.5, 0.03, -9],
          ]
        : i === 1
          ? [
              [6, 0.03, 12],
              [-6, 0.03, -16],
            ]
          : [
              [-19 + i * 4, 0.03, -4],
              [19 - i * 4, 0.03, 4],
            ];
    for (const pos of locations) fieldProp(engine, mechanic, pos, index++);
  }
  engine.spawn('rift-gate', { name: 'exit-gate', pos: [0, 0, -23], scale: 0.68 });
  const e = engine.world.named('exit-gate')!;
  engine.world.get(e, Model)!.tint = '#718b85';
  // Small floating fragments make repeated layouts feel less static without affecting collision.
  for (let i = 0; i < 7; i++) {
    const x = rng.spread(20),
      z = rng.spread(20);
    const shard = scenery(
      engine,
      `rift-shard-${i}`,
      [x, 9 + rng.range(0, 8), z],
      [{ shape: 'cone', size: [0.7, 1.8, 0.7], material: 'brass', segments: 4, color: plan.color }],
    );
    engine.world.add(shard, Motion, { bob: 0.35, bobRate: 0.15, spin: [0, rng.range(8, 20), 3] });
    engine.world.get(shard, Transform)!.rot.setFromAxisAngle(new Vector3(0, 0, 1), 0.3);
  }
}
