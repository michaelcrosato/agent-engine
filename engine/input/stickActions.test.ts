import { describe, expect, test } from 'vitest';
import { stickActions } from './stickActions.ts';

describe('stickActions', () => {
  test('ignores the deadzone and scales analog movement up to 1', () => {
    expect(stickActions(5, 0, 60).size).toBe(0);
    const half = stickActions(0, -30, 60);
    expect(half.get('moveForward')).toBeGreaterThan(0.3);
    expect(half.get('moveForward')).toBeLessThan(0.5);
    expect(stickActions(0, -200, 60).get('moveForward')).toBeCloseTo(1, 5);
  });

  test('diagonals split across two actions; full forward push sprints', () => {
    const d = stickActions(40, 40, 60);
    expect(d.get('moveRight')).toBeCloseTo(d.get('moveBack')!, 5);
    expect(d.has('sprint')).toBe(false);
    expect(stickActions(0, -60, 60).get('sprint')).toBe(1);
    expect(stickActions(-60, 0, 60).has('sprint')).toBe(false);
  });
});
