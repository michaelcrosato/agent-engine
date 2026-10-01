import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from 'three';
import { defineService } from '../core/defineService.ts';
import { defineSystem } from '../core/defineSystem.ts';
import { Transform } from '../core/Transform.ts';
import type { Entity } from '../core/World.ts';
import { Label } from './Label.ts';
import { RendererKey } from './Renderer.ts';

type Built = { mesh: Mesh; key: string };

export const LabelsKey = defineService<Map<Entity, Built>>(
  'labels',
  'Built text sign meshes (browser only).',
);

const tmp = new Vector3();

function makeMesh(l: ReturnType<typeof Label.create>): Mesh {
  const lines = l.text.split('\n');
  const px = 64;
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d')!;
  g.font = `600 ${px}px system-ui, sans-serif`;
  const w = Math.ceil(Math.max(...lines.map((s) => g.measureText(s).width)) + px);
  canvas.width = w;
  canvas.height = Math.ceil(lines.length * px * 1.25 + px * 0.5);
  g.font = `600 ${px}px system-ui, sans-serif`;
  g.globalAlpha = l.opacity;
  g.fillStyle = l.background;
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.globalAlpha = 1;
  g.fillStyle = l.color;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  for (const [i, s] of lines.entries()) g.fillText(s, canvas.width / 2, px * 0.25 + px * 1.25 * (i + 0.5));
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  const scale = l.size / (px * 1.25);
  const mat = new MeshBasicMaterial({
    map: tex,
    color: '#d8d8d8',
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  // Two single-sided panels back to back: the text reads correctly from either side.
  const geo = new PlaneGeometry(canvas.width * scale, canvas.height * scale);
  const front = new Mesh(geo, mat);
  const back = new Mesh(geo, mat);
  back.rotation.y = Math.PI;
  front.add(back);
  return front;
}

/** Draws Label components as text panels (browser only). */
export const LabelSystem = defineSystem({
  name: 'LabelSystem',
  doc: 'Creates and places text sign meshes for Label components.',
  phase: 'frame',
  run(ctx) {
    const r = ctx.service(RendererKey);
    let map = ctx.engine.tryService(LabelsKey);
    if (!map) ctx.engine.provide(LabelsKey, (map = new Map()));
    const w = ctx.world;
    for (const [e, b] of map) {
      const l = w.get(e, Label);
      if (w.isAlive(e) && l && b.key === JSON.stringify([l.text, l.size, l.color, l.background, l.opacity]))
        continue;
      r.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      (b.mesh.material as MeshBasicMaterial).map?.dispose();
      map.delete(e);
    }
    for (const e of w.query(Label, Transform)) {
      const l = w.get(e, Label)!;
      let b = map.get(e);
      if (!b) {
        b = { mesh: makeMesh(l), key: JSON.stringify([l.text, l.size, l.color, l.background, l.opacity]) };
        r.scene.add(b.mesh);
        map.set(e, b);
      }
      const t = w.get(e, Transform)!;
      b.mesh.position.copy(tmp.copy(l.offset).applyQuaternion(t.rot).add(t.pos));
      if (l.billboard) b.mesh.quaternion.copy(r.camera.quaternion);
      else b.mesh.quaternion.copy(t.rot);
    }
  },
});
