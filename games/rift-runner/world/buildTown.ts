import { Animator, type Engine, Light, Motion, Transform } from '#engine/api.ts';
import { block, buildScenery, type PartInput, scenery, sign } from './buildScenery.ts';
import { dressTown } from './dressTown.ts';

function stall(engine: Engine, name: string, x: number, z: number, accent: string, yaw: number): void {
  const parts: PartInput[] = [
    { size: [7, 0.35, 5], material: 'stone' },
    { size: [7.6, 0.3, 5.7], pos: [0, 4.4, 0], material: 'dark' },
    { shape: 'wedge', size: [7.5, 0.65, 5.5], pos: [0, 4.7, 0], material: accent, rot: 180 },
    { size: [6.7, 0.08, 0.12], pos: [0, 4.05, 2.5], material: 'cyan' },
    { size: [5.8, 1, 0.95], pos: [0, 0.35, 1.55], material: 'wood' },
  ];
  for (const dx of [-3.25, 3.25])
    parts.push({ size: [0.2, 4.1, 0.2], pos: [dx, 0.35, 2.4], material: 'brass' });
  for (let i = 0; i < 5; i++)
    parts.push({
      size: [0.55, 0.5 + (i % 2) * 0.3, 0.5],
      pos: [-2 + i, 1.35, 1.5],
      material: i % 2 ? 'brass' : 'dark',
    });
  scenery(engine, name, [x, 0, z], parts, undefined, yaw);
  block(engine, `${name}-counter`, [x, 0, z + 1.55], [5.8, 1.3, 0.95], 'wood');
  block(engine, `${name}-back`, [x, 0.35, z - 2.2], [6.6, 4.3, 0.4], 'plaster');
}

export function buildTown(engine: Engine): void {
  buildScenery(engine, true);
  dressTown(engine);
  block(engine, 'main-walk', [0, 0.01, 4], [9, 0.08, 41], 'paving');
  block(engine, 'market-walk', [0, 0.02, 1], [39, 0.09, 6], 'paving');
  for (const x of [-5.1, 5.1]) {
    for (let z = -13; z < 22; z += 3)
      scenery(engine, `inlay-${x}-${z}`, [x, 0.12, z], [{ size: [0.12, 0.035, 1.1], material: 'cyan' }]);
  }
  stall(engine, 'forge-stall', 13, -3, 'rust', 0);
  stall(engine, 'market-stall', -13, -3, 'teal', 0);
  stall(engine, 'mentor-stall', -13, 12, 'cream', 0);
  for (const [id, name, x, z, clip, tint] of [
    ['forge', 'BRASS / THE FORGE', 12, -1, 'runner-forge', '#ffc08e'],
    ['vendor', 'VEL / THE EXCHANGE', -12, -1, 'runner-wave', '#b1eddf'],
    ['guide', 'ION / THE ARCHIVE', -12, 14, 'runner-study', '#bfc2ff'],
  ] as const) {
    const e = engine.spawn('town-agent', {
      name: id,
      pos: [x, 0.35, z],
      rot: 180,
      tags: ['town-npc'],
      with: { Model: { tint, puppet: id === 'forge' ? 'brass' : id === 'vendor' ? 'vel' : 'ion' } },
    });
    engine.world.get(e, Animator)!.play = clip;
    sign(engine, `${id}-sign`, [x, 4.1, z + 0.3], name, '#fff0cb', 0.3);
  }
  engine.spawn('rift-gate', { name: 'gate', pos: [0, 0.1, -12] });
  sign(engine, 'gate-sign', [0, 7.3, -12], 'THE FRACTURE', '#a7fff0', 0.54);
  sign(engine, 'town-name', [0, 0.22, 6], '');
  for (const [x, z] of [
    [-7, -9],
    [7, -9],
    [-7, 14],
    [7, 14],
    [20, 10],
    [-21, 8],
  ]) {
    const e = scenery(
      engine,
      `lamp-${x}-${z}`,
      [x!, 0, z!],
      [
        { shape: 'cylinder', size: [0.8, 0.25, 0.8], material: 'stone' },
        { shape: 'cylinder', size: [0.12, 3.5, 0.12], material: 'brass' },
        { shape: 'sphere', size: 0.42, pos: [0, 3.45, 0], material: 'amber' },
        { shape: 'cone', size: [0.9, 0.22, 0.9], pos: [0, 3.9, 0], material: 'dark' },
      ],
    );
    engine.world.add(e, Light, { color: '#ffc690', intensity: 9, range: 8, offset: [0, 3.4, 0] });
  }
  for (let i = 0; i < 8; i++) {
    const x = i % 2 ? 20 : -21;
    const z = -20 + Math.floor(i / 2) * 13;
    scenery(
      engine,
      `tree-${i}`,
      [x, 0, z],
      [
        { shape: 'cylinder', size: [0.5, 3.8, 0.5], material: 'wood', rot: [0, 0, i % 2 ? 8 : -8] },
        { shape: 'sphere', size: [4.3, 2.4, 3.7], segments: 7, pos: [0, 3.3, 0], material: 'leaves' },
        { shape: 'sphere', size: [3, 2, 2.8], segments: 7, pos: [0.9, 4.7, 0.1], material: 'leaves' },
      ],
    );
  }
  for (let i = 0; i < 5; i++) {
    engine.spawn('supply-crate', { pos: [8 + (i % 2) * 2, 0, 16 + Math.floor(i / 2) * 2], rot: i * 17 });
  }
  const drone = engine.spawn('rift-wisp', { name: 'town-companion', pos: [5, 2.8, 6], tags: ['companion'] });
  engine.world.add(drone, Motion, { bob: 0.3, bobRate: 0.32, spin: [0, 15, 0] });
  // Decorative inhabitants do not join combat or block the promenade.
  engine.world.get(drone, Transform)!.scale.setScalar(0.65);
}
