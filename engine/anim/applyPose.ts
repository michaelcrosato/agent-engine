import { Euler, MathUtils, type Object3D } from 'three';
import type { PuppetInstance } from '../render/buildPuppet.ts';
import type { ClipData } from './Clip.ts';
import { sampleClip } from './sampleClip.ts';

type Offsets = { pos: number[]; rot: number[]; scale: number[] };

const AXIS: Record<string, number> = { x: 0, y: 1, z: 2 };

/** Adds weighted clip samples into per-part offsets. */
export function accumulate(acc: Map<string, Offsets>, clip: ClipData, time: number, weight: number): void {
  if (weight <= 0) return;
  for (const s of sampleClip(clip, time)) {
    let o = acc.get(s.part);
    if (!o) acc.set(s.part, (o = { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] }));
    const [kind, axis] = s.prop.split('.') as ['pos' | 'rot' | 'scale', string | undefined];
    if (kind === 'scale') {
      const axes = axis ? [AXIS[axis]!] : [0, 1, 2];
      for (const a of axes) o.scale[a] = o.scale[a]! * (1 + (s.value - 1) * weight);
    } else o[kind][AXIS[axis!]!] = o[kind][AXIS[axis!]!]! + s.value * weight;
  }
}

const e = new Euler();

/** Sets every joint to rest pose plus accumulated offsets. */
export function applyPose(inst: PuppetInstance, acc: Map<string, Offsets>): void {
  for (const [id, rest] of inst.rest) {
    const j: Object3D = inst.joints.get(id)!;
    const o = acc.get(id);
    j.position.set(
      rest.pos[0] + (o?.pos[0] ?? 0),
      rest.pos[1] + (o?.pos[1] ?? 0),
      rest.pos[2] + (o?.pos[2] ?? 0),
    );
    e.set(
      MathUtils.degToRad(rest.rot[0] + (o?.rot[0] ?? 0)),
      MathUtils.degToRad(rest.rot[1] + (o?.rot[1] ?? 0)),
      MathUtils.degToRad(rest.rot[2] + (o?.rot[2] ?? 0)),
      'YXZ',
    );
    j.quaternion.setFromEuler(e);
    j.scale.set(
      rest.scale[0] * (o?.scale[0] ?? 1),
      rest.scale[1] * (o?.scale[1] ?? 1),
      rest.scale[2] * (o?.scale[2] ?? 1),
    );
  }
}
