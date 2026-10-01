import { PointLight, SpotLight, Vector3 } from 'three';
import { defineSystem } from '../core/defineSystem.ts';
import { Transform } from '../core/Transform.ts';
import { Light } from './Light.ts';
import { RendererKey } from './Renderer.ts';

const tmp = new Vector3();

/** Mirrors Light components as Three point/spot lights, with flicker and pulse. */
export const LightSystem = defineSystem({
  name: 'LightSystem',
  doc: 'Creates and updates scene lights for entities with Light + Transform.',
  phase: 'frame',
  run(ctx) {
    const r = ctx.service(RendererKey);
    const w = ctx.world;
    for (const [e, obj] of r.lights) {
      const l = w.get(e, Light);
      if (w.isAlive(e) && l && (obj as PointLight).userData.type === l.type) continue;
      r.scene.remove(obj);
      (obj as PointLight).dispose();
      r.lights.delete(e);
    }
    const t = ctx.time.elapsed;
    for (const e of w.query(Light, Transform)) {
      const l = w.get(e, Light)!;
      let obj = r.lights.get(e) as PointLight | SpotLight | undefined;
      if (!obj) {
        obj = l.type === 'spot' ? new SpotLight() : new PointLight();
        obj.userData.type = l.type;
        obj.castShadow = l.shadows;
        if (l.shadows) obj.shadow.mapSize.set(512, 512);
        r.scene.add(obj);
        if (obj instanceof SpotLight) r.scene.add(obj.target);
        r.lights.set(e, obj);
      }
      const tr = w.get(e, Transform)!;
      obj.position.copy(tmp.copy(l.offset).applyQuaternion(tr.rot).add(tr.pos));
      obj.color.set(l.color);
      obj.distance = l.range;
      obj.decay = 2;
      let k = 1;
      if (l.flicker > 0) k *= 1 - l.flicker * (0.5 + 0.5 * Math.sin(t * 37 + e) * Math.sin(t * 23.3 + e * 2));
      if (l.pulse > 0) k *= 0.6 + 0.4 * Math.sin(t * l.pulse * Math.PI * 2);
      obj.intensity = l.on ? l.intensity * k : 0;
      if (obj instanceof SpotLight) {
        obj.angle = (l.angle * Math.PI) / 180;
        obj.penumbra = 0.4;
        obj.target.position.copy(obj.position).add(l.aim);
      }
    }
  },
});
