import type { Engine } from '../core/Engine.ts';
import { EngineError } from '../core/EngineError.ts';
import { Transform } from '../core/Transform.ts';
import type { Entity } from '../core/World.ts';
import { Model } from '../model/Model.ts';
import { Body } from '../physics/Body.ts';
import { type BuiltGrid, buildGrid, cellCenter } from './buildGrid.ts';
import { RoomLoaded } from './levelEvents.ts';
import { RoomKind } from './Room.ts';
import { SpawnPoint } from './SpawnPoint.ts';

export type LoadRoomOptions = {
  /** SpawnPoint id (or entity name) to place the player at. Default: "default", else the first. */
  spawn?: string;
};

function spawnBlocks(engine: Engine, grid: BuiltGrid): void {
  const w = engine.world;
  grid.blocks.forEach((b, i) => {
    const e = w.spawn({ name: `grid:${b.kind}:${i}`, tags: ['level', b.kind] });
    w.add(e, Transform, { pos: b.pos });
    w.add(e, Body, { type: 'static', shape: 'box', size: b.size, layer: 'world' });
    w.add(e, Model, { parts: [{ shape: 'box', size: b.size, material: b.material, uv: 'world' }] });
  });
}

function placePlayer(engine: Engine, spawn: string | undefined): Entity | undefined {
  const prefab = engine.game.playerPrefab;
  if (!prefab) return undefined;
  const w = engine.world;
  const points = w.query(SpawnPoint, Transform);
  if (!points.length) {
    throw new EngineError({
      code: 'ROOM_NO_SPAWN',
      what: `Room "${engine.roomId}" has no SpawnPoint for the player`,
      where: { file: engine.content.entry(RoomKind, engine.roomId)?.file },
      fix: 'Put a "P" glyph in the grid, or add { "prefab": "spawn", "pos": [x, y, z] } to entities.',
    });
  }
  const want = spawn ?? 'default';
  const pick =
    points.find((p) => w.get(p, SpawnPoint)!.id === want || w.nameOf(p) === want) ??
    points.find((p) => w.get(p, SpawnPoint)!.id === 'default') ??
    points[0]!;
  const at = w.get(pick, Transform)!;
  const existing = w.tagged('player')[0];
  if (existing !== undefined) {
    const t = w.need(existing, Transform, 'loadRoom');
    t.pos.copy(at.pos);
    t.rot.copy(at.rot);
    return existing;
  }
  return engine.spawn(prefab, { name: 'player', pos: at.pos, rot: at.rot.clone() });
}

/**
 * Builds a room: clears non-persistent entities, runs plugin hooks, spawns grid geometry,
 * glyph prefabs, and placed entities, then places the player at a SpawnPoint.
 */
export function loadRoom(engine: Engine, id: string, opts: LoadRoomOptions = {}): void {
  const room = engine.content.get(RoomKind, id);
  const file = engine.content.entry(RoomKind, id)?.file;
  const plugins = engine.game.plugins;
  if (engine.room) for (const p of plugins) p.roomUnload?.(engine);
  const w = engine.world;
  for (const e of w.entities()) if (!w.hasTag(e, 'persist')) w.destroy(e);
  w.flush();
  engine.roomId = id;
  engine.room = room;
  engine.activeTuning = [...engine.game.tuning, ...room.tuning, ...engine.extraTuning];
  engine.grid = room.grid ? buildGrid(room.grid, file) : undefined;
  for (const p of plugins) p.roomLoad?.(engine, room);

  const grid = engine.grid;
  if (grid) {
    spawnBlocks(engine, grid);
    for (const pl of grid.placements) {
      engine.spawn(pl.prefab, {
        name: pl.name,
        pos: pl.pos,
        rot: pl.rot,
        with: pl.with,
        where: { file, path: pl.path },
      });
    }
  }
  room.entities.forEach((pl, i) => {
    const where = { file, path: `$.entities[${i}]` };
    let pos: [number, number, number] = [0, 0, 0];
    if (pl.pos !== undefined) pos = typeof pl.pos === 'number' ? [pl.pos, pl.pos, pl.pos] : pl.pos;
    else if (pl.cell) {
      if (!grid)
        throw new EngineError({
          code: 'ROOM_CELL_WITHOUT_GRID',
          what: '"cell" used in a room without a grid',
          where,
          fix: 'Use "pos" instead, or add a grid.',
        });
      const floor = grid.cells[pl.cell[1]]?.[pl.cell[0]]?.floor ?? 0;
      pos = cellCenter(grid.cell, pl.cell[0], pl.cell[1], floor);
    }
    engine.spawn(pl.prefab, {
      ...(pl.name ? { name: pl.name } : {}),
      pos,
      rot: pl.rot,
      scale: pl.scale,
      with: pl.with,
      tags: pl.tags,
      where,
    });
  });
  const player = placePlayer(engine, opts.spawn);
  for (const p of plugins) p.roomReady?.(engine, room);
  engine.events.emit(RoomLoaded, { room: id, player });
}
