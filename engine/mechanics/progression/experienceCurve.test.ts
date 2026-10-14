import { expect, test } from 'vitest';
import { experienceCost, experienceCurve, levelsFromExperience } from './experienceCurve.ts';

test('closed-form progression matches ordinary leveling and scales to large rewards', () => {
  for (const level of [1, 17, 1000]) {
    let total = 0;
    for (let n = 1; n <= 40; n++) {
      total += experienceCurve(level + n - 1);
      expect(experienceCost(level, n)).toBe(total);
      expect(levelsFromExperience(level, total)).toBe(n);
      expect(levelsFromExperience(level, total - 1)).toBe(n - 1);
    }
  }
  const count = levelsFromExperience(1, 1e24);
  expect(count).toBeGreaterThan(1e6);
  expect(experienceCost(1, count)).toBeLessThanOrEqual(1e24);
  expect(experienceCost(1, count + 1)).toBeGreaterThan(1e24);
  expect(Number.isFinite(experienceCurve(Number.MAX_SAFE_INTEGER))).toBe(true);
});
