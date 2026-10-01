import { describe, expect, test } from 'vitest';
import { RoomDoc } from './RoomDoc.ts';

const room = () => ({
  doc: 'test',
  grid: { cell: 2, rows: ['#####', '#...#', '#####'] },
  entities: [
    { prefab: 'crate', name: 'box', pos: [1, 0, 1] },
    { prefab: 'lamp', cell: [2, 1], rot: 90 },
  ],
});

describe('RoomDoc', () => {
  test('moves, rotates, and overrides with undo/redo', () => {
    const d = new RoomDoc('t', 'games/g/data/rooms/t.json', room());
    expect(d.dirty).toBe(false);
    d.move(0, [3.333, 0, 4]);
    expect(d.placement(0)!.pos).toEqual([3.33, 0, 4]);
    d.move(1, [7.1, 0, 2.5], { cell: 2 });
    expect(d.placement(1)!.cell).toEqual([3, 1]);
    d.rotate(1, 135);
    expect(d.placement(1)!.rot).toBe(-135);
    d.override(0, 'Health', 'max', 50);
    expect(d.placement(0)!.with).toEqual({ Health: { max: 50 } });
    d.override(0, 'Health', 'max', undefined);
    expect(d.placement(0)!.with).toBeUndefined();
    expect(d.dirty).toBe(true);
    while (d.undo());
    expect(d.json).toEqual(room());
    d.redo();
    expect(d.placement(0)!.pos).toEqual([3.33, 0, 4]);
  });

  test('duplicates with a unique name and paints grid cells as one undo step', () => {
    const d = new RoomDoc('t', 'x.json', room());
    expect(d.duplicate(0)).toBe(2);
    expect(d.placement(2)).toMatchObject({ name: 'box-2', pos: [2, 0, 1] });
    expect(d.duplicate(2)).toBe(3);
    expect(d.placement(3)!.name).toBe('box-3');
    d.paint(
      [
        [1, 1],
        [2, 1],
        [9, 9],
      ],
      '=',
    );
    expect((d.json.grid as { rows: string[] }).rows[1]).toBe('#==.#');
    d.undo();
    expect((d.json.grid as { rows: string[] }).rows[1]).toBe('#...#');
    expect(d.paint([[1, 1]], '.')).toBe(false);
  });
});
