/** Quadratic per-level XP curve, summed without iterating through individual levels. */
export function experienceCurve(level: number): number {
  return 100 + level * 45 + level * level * 5;
}

/** Cost of n levels starting at level. This form avoids subtracting two huge nearby cubes. */
export function experienceCost(level: number, n: number): number {
  return (
    n * experienceCurve(level) + ((45 + 10 * level) * n * (n - 1)) / 2 + (5 * n * (n - 1) * (2 * n - 1)) / 6
  );
}

/** Logarithmic search keeps even very large catch-up rewards cheap and finite. */
export function levelsFromExperience(level: number, xp: number): number {
  let low = 0;
  let high = Math.min(Number.MAX_SAFE_INTEGER - level, Math.floor(xp / experienceCurve(level)));
  while (low < high) {
    const mid = low + Math.ceil((high - low) / 2);
    if (experienceCost(level, mid) <= xp) low = mid;
    else high = mid - 1;
  }
  return low;
}
