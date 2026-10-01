import {
  BoxGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  type Scene,
} from 'three';
import { AmbientSound } from '../audio/AmbientSound.ts';
import { Transform } from '../core/Transform.ts';
import type { Entity, World } from '../core/World.ts';
import { SpawnPoint } from '../level/SpawnPoint.ts';
import { RoomExit } from '../logic/RoomExit.ts';
import { Trigger } from '../logic/Trigger.ts';
import { Model } from '../model/Model.ts';
import { Body } from '../physics/Body.ts';
import { Light } from '../render/Light.ts';

const octa = new OctahedronGeometry(0.22);
const unitBox = new EdgesGeometry(new BoxGeometry(1, 1, 1));

function colorOf(w: World, e: Entity): string {
  if (w.hasTag(e, 'player')) return '#ff66cc';
  if (w.has(e, SpawnPoint)) return '#44ff88';
  if (w.has(e, RoomExit) || w.has(e, Trigger) || w.get(e, Body)?.sensor) return '#ffd84a';
  if (w.has(e, Light)) return '#ffffff';
  if (w.has(e, AmbientSound)) return '#4ad8ff';
  return '#c08cff';
}

type Marker = { group: Group; key: string };

/**
 * Edit-mode helpers so invisible entities can be seen and clicked: a small diamond for every
 * entity without a Model (spawns, triggers, lights, sounds, signs) and an outline for sensors.
 */
export class EditorMarkers {
  private readonly scene: Scene;
  private readonly markers = new Map<Entity, Marker>();
  readonly root = new Group();

  constructor(scene: Scene) {
    this.scene = scene;
    scene.add(this.root);
  }

  private build(w: World, e: Entity): Group {
    const g = new Group();
    g.userData.entity = e;
    const color = colorOf(w, e);
    if (!w.has(e, Model)) {
      const m = new Mesh(octa, new MeshBasicMaterial({ color, wireframe: false, toneMapped: false }));
      m.position.y = 0.4;
      g.add(m);
    }
    const body = w.get(e, Body);
    if (body?.sensor) {
      const box = new LineSegments(unitBox, new LineBasicMaterial({ color, toneMapped: false }));
      box.scale.copy(body.size);
      box.position.copy(body.offset);
      if (body.pivot === 'bottom') box.position.y += body.size.y / 2;
      g.add(box);
    }
    return g;
  }

  /** Adds/removes/moves markers to match the world. Call every frame in edit mode. */
  sync(w: World): void {
    for (const [e, m] of this.markers) {
      if (w.isAlive(e)) continue;
      this.root.remove(m.group);
      this.markers.delete(e);
    }
    for (const e of w.query(Transform)) {
      if (w.hasTag(e, 'level')) continue;
      const needs = !w.has(e, Model) || !!w.get(e, Body)?.sensor;
      const key = `${colorOf(w, e)}|${JSON.stringify(w.get(e, Body)?.size ?? '')}`;
      let m = this.markers.get(e);
      if (m && (!needs || m.key !== key)) {
        this.root.remove(m.group);
        this.markers.delete(e);
        m = undefined;
      }
      if (!needs) continue;
      if (!m) {
        m = { group: this.build(w, e), key };
        this.root.add(m.group);
        this.markers.set(e, m);
      }
      const t = w.get(e, Transform)!;
      m.group.position.copy(t.pos);
      m.group.quaternion.copy(t.rot);
    }
  }

  set visible(v: boolean) {
    this.root.visible = v;
  }

  dispose(): void {
    this.scene.remove(this.root);
    this.markers.clear();
  }
}
