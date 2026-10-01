import { WebAudioOut } from '../audio/WebAudioOut.ts';
import type { Engine } from '../core/Engine.ts';
import { Transform } from '../core/Transform.ts';
import { RendererKey } from '../render/Renderer.ts';
import type { ErrorPanel } from './ErrorPanel.ts';

/** Reloads the current room but keeps the player where they were (pose, pitch). */
export function reloadRoomKeepingPlayer(engine: Engine): void {
  const p = engine.world.tagged('player')[0];
  const t = p !== undefined ? engine.world.get(p, Transform) : undefined;
  const pos = t?.pos.clone();
  const rot = t?.rot.clone();
  engine.loadRoom(engine.roomId);
  if (p !== undefined && pos && rot && engine.world.isAlive(p)) engine.physics.teleport(p, pos, rot);
}

/**
 * Applies a changed data file without a page reload: rooms/prefabs/puppets/tuning rebuild the
 * room (player stays put), looks/textures/post re-skin, sounds re-synthesize and preview.
 */
export function applyContentChange(engine: Engine, errors: ErrorPanel, path: string, text: string): void {
  const entry = engine.content.upsert({ path, text });
  if (!entry) return;
  errors.clear();
  if (entry.errors.length) {
    for (const e of entry.errors) errors.show(e.message);
    return;
  }
  const r = engine.tryService(RendererKey);
  const kind = entry.kind.name;
  engine.log.info(`hot reload: ${kind} "${entry.id}"`);
  try {
    if (kind === 'room' || kind === 'prefab' || kind === 'puppet' || kind === 'tuning')
      reloadRoomKeepingPlayer(engine);
    else if (kind === 'look' || kind === 'post') r?.applyLook(r.lookId);
    else if (kind === 'texture') {
      r?.textures.invalidate(entry.id);
      r?.applyLook(r.lookId);
    } else if (kind === 'sound' && engine.audio instanceof WebAudioOut) {
      engine.audio.invalidate(entry.id);
      engine.audio.play(entry.id);
    } else if (kind === 'music' && engine.audio.currentMusic === entry.id) {
      engine.audio.music(null, { fade: 0.1 });
      engine.audio.music(entry.id);
    }
  } catch (err) {
    errors.show(err instanceof Error ? err.message : String(err));
  }
}
