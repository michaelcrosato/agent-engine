/** Levenshtein distance, small and allocation-light; fine for name lists of a few hundred. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** Returns up to `max` candidates closest to `name` (case-insensitive), best first. */
export function suggest(name: string, candidates: Iterable<string>, max = 3): string[] {
  const lower = name.toLowerCase();
  const scored: Array<[string, number]> = [];
  for (const c of candidates) {
    const cl = c.toLowerCase();
    let d = editDistance(lower, cl);
    if (cl.includes(lower) || lower.includes(cl)) d = Math.min(d, 1);
    if (d <= Math.max(2, Math.floor(lower.length / 2))) scored.push([c, d]);
  }
  scored.sort((x, y) => x[1] - y[1] || x[0].localeCompare(y[0]));
  return scored.slice(0, max).map((s) => s[0]);
}

/** Formats a "did you mean" clause, or a short list of what exists when nothing is close. */
export function didYouMean(name: string, candidates: Iterable<string>): string {
  const all = [...candidates];
  const close = suggest(name, all);
  if (close.length) return `Did you mean ${close.map((c) => `"${c}"`).join(' or ')}?`;
  if (!all.length) return 'None are defined yet.';
  const shown = all
    .slice(0, 8)
    .map((c) => `"${c}"`)
    .join(', ');
  return `Known: ${shown}${all.length > 8 ? `, … (${all.length} total)` : ''}.`;
}
