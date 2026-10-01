import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { defineSystem } from '../core/defineSystem.ts';
import { Transform } from '../core/Transform.ts';
import { CameraRig } from './CameraRig.ts';
import { RendererKey } from './Renderer.ts';
import { lerpPose, TransformHistoryKey } from './TransformHistory.ts';

const pos = new Vector3();
const rot = new Quaternion();
const eye = new Vector3();
const pitchQ = new Quaternion();
const back = new Vector3();

/** Places the render camera on the highest-priority CameraRig (first or third person). */
export const CameraSystem = defineSystem({
  name: 'CameraSystem',
  doc: 'Moves the render camera to the active CameraRig entity.',
  phase: 'frame',
  order: 50,
  run(ctx) {
    const r = ctx.service(RendererKey);
    if (r.cameraOverride) {
      r.camera.position.copy(r.cameraOverride.pos);
      r.camera.lookAt(r.cameraOverride.target);
      return;
    }
    const w = ctx.world;
    let best: number | undefined;
    let bestPri = -Infinity;
    for (const e of w.query(CameraRig, Transform)) {
      const p = w.get(e, CameraRig)!.priority;
      if (p > bestPri) {
        bestPri = p;
        best = e;
      }
    }
    if (best === undefined) return;
    const rig = w.get(best, CameraRig)!;
    lerpPose(
      ctx.engine.tryService(TransformHistoryKey),
      best,
      w.get(best, Transform)!,
      ctx.time.alpha,
      pos,
      rot,
    );
    eye.copy(rig.offset).applyQuaternion(rot).add(pos);
    pitchQ.setFromEuler(new Euler(MathUtils.degToRad(rig.pitch), 0, 0, 'YXZ'));
    const view = rot.clone().multiply(pitchQ);
    const cam = r.camera;
    if (rig.mode === 'third') {
      back.set(0, 0, 1).applyQuaternion(view);
      const hit = ctx.physics.raycast(eye, back, rig.distance, { exclude: best });
      cam.position.copy(eye).addScaledVector(back, hit ? Math.max(0.2, hit.distance - 0.2) : rig.distance);
    } else cam.position.copy(eye);
    cam.quaternion.copy(view);
    if (cam.fov !== rig.fov) {
      cam.fov = rig.fov;
      cam.updateProjectionMatrix();
    }
  },
});
