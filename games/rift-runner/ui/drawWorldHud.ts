import { Vector3 } from 'three';
import { type Engine, Health, hp, RendererKey, Transform } from '#engine/api.ts';
import { RunKey } from '../RunState.ts';
import { RiftEnemy } from '../systems/RiftEnemy.ts';
import { escapeHtml as esc } from './uiFormat.ts';

/** Screen projections and a live minimap share the actual world state; nothing is decorative data. */
export function drawWorldHud(engine: Engine, root: HTMLElement, canvas: HTMLCanvasElement): void {
  const r = engine.tryService(RendererKey);
  const s = engine.service(RunKey);
  if (!r || !s.started || s.panel) {
    root.innerHTML = '';
    canvas.hidden = true;
    return;
  }
  canvas.hidden = false;
  const g = canvas.getContext('2d')!;
  const size = canvas.width;
  g.clearRect(0, 0, size, size);
  const point = (x: number, z: number) => [size / 2 + (x * size) / 64, size / 2 + (z * size) / 64] as const;
  g.strokeStyle = '#b9e5cf35';
  g.lineWidth = 1;
  g.strokeRect((size * 5) / 64, (size * 5) / 64, (size * 54) / 64, (size * 54) / 64);
  g.beginPath();
  g.moveTo(size / 2, 0);
  g.lineTo(size / 2, size);
  g.moveTo(0, size / 2);
  g.lineTo(size, size / 2);
  g.stroke();
  g.font = '8px sans-serif';
  g.fillStyle = '#b5dfcc';
  g.fillText('N', size / 2 - 3, 12);
  const width = engine.host!.overlay.clientWidth,
    height = engine.host!.overlay.clientHeight;
  const toScreen = (at: Vector3) => {
    const projected = at.clone().project(r.camera);
    return projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1
      ? [((projected.x + 1) * width) / 2, ((1 - projected.y) * height) / 2]
      : undefined;
  };
  let html = '';
  const w = engine.world;
  const player = w.tagged('player')[0];
  const playerPos = player === undefined ? undefined : w.get(player, Transform)?.pos;
  for (const e of w.query(RiftEnemy, Health, Transform)) {
    const h = w.get(e, Health)!;
    if (h.dead) continue;
    const enemy = w.get(e, RiftEnemy)!;
    const at = w.get(e, Transform)!.pos;
    const [x, y] = point(at.x, at.z);
    g.fillStyle = enemy.boss ? '#ffce85' : '#f7987c';
    g.beginPath();
    g.arc(x, y, enemy.boss ? 4 : 2, 0, Math.PI * 2);
    g.fill();
    if (enemy.boss)
      html += `<div class="rift-boss"><small>${esc(enemy.title).toUpperCase()}${hp(h) < h.max / 2 ? ' / ENRAGED' : ''}</small><div class="rift-bar"><span style="width:${(hp(h) / h.max) * 100}%"></span></div></div>`;
    else if (playerPos && at.distanceTo(playerPos) < 27) {
      const screen = toScreen(at.clone().add(new Vector3(0, 2.35, 0)));
      if (screen)
        html += `<div class="rift-enemybar" style="left:${screen[0]}px;top:${screen[1]}px"><span style="width:${(hp(h) / h.max) * 100}%"></span>${enemy.modifier !== 'none' ? `<small>${enemy.modifier}</small>` : ''}</div>`;
    }
  }
  for (const tag of ['loot-item', 'town-npc'])
    for (const e of w.tagged(tag)) {
      const at = w.get(e, Transform)!.pos;
      const [x, y] = point(at.x, at.z);
      g.fillStyle = tag === 'town-npc' ? '#c4e4ff' : '#d6b3fa';
      g.fillRect(x - 2, y - 2, 4, 4);
    }
  if (player !== undefined && playerPos) {
    const [x, y] = point(playerPos.x, playerPos.z);
    const dir = new Vector3(0, 0, -1).applyQuaternion(w.get(player, Transform)!.rot);
    g.strokeStyle = '#b8ffe1';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + dir.x * 10, y + dir.z * 10);
    g.stroke();
    g.fillStyle = '#e4ffee';
    g.beginPath();
    g.arc(x, y, 3, 0, Math.PI * 2);
    g.fill();
  }
  s.damageNumbers = s.damageNumbers.filter((n) => n.until > engine.time.elapsed).slice(-48);
  for (const n of s.damageNumbers) {
    const screen = toScreen(
      new Vector3(...n.at).add(new Vector3(0, (1 - (n.until - engine.time.elapsed)) * 0.9, 0)),
    );
    if (screen)
      html += `<div class="rift-float" style="left:${screen[0]}px;top:${screen[1]}px;color:${n.color};opacity:${Math.min(1, (n.until - engine.time.elapsed) * 3)}">${esc(n.text)}</div>`;
  }
  root.innerHTML = html;
}
