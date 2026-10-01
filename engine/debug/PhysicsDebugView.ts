import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments, type Scene } from 'three';
import type { Physics } from '../physics/Physics.ts';

/** Draws every collider as wireframe lines (Rapier's debug render), refreshed each frame. */
export class PhysicsDebugView {
  private readonly lines: LineSegments;
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
    const mat = new LineBasicMaterial({ vertexColors: true, transparent: true, toneMapped: false });
    this.lines = new LineSegments(new BufferGeometry(), mat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 999;
    scene.add(this.lines);
  }

  update(physics: Physics): void {
    const { vertices, colors } = physics.rapierWorld.debugRender();
    const g = this.lines.geometry;
    g.setAttribute('position', new BufferAttribute(vertices, 3));
    g.setAttribute('color', new BufferAttribute(colors, 4));
    g.computeBoundingSphere();
  }

  dispose(): void {
    this.scene.remove(this.lines);
    this.lines.geometry.dispose();
    (this.lines.material as LineBasicMaterial).dispose();
  }
}
