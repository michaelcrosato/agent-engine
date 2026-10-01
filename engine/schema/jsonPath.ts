/** A path into JSON data: object keys and array indices. */
export type PathSegment = string | number;

const IDENT = /^[A-Za-z_$][\w$-]*$/;

/** Formats segments as a JSON path: `$.entities[3].with.Health.max`. */
export function formatJsonPath(segments: readonly PropertyKey[], base = '$'): string {
  let out = base;
  for (const s of segments) {
    if (typeof s === 'number') out += `[${s}]`;
    else if (typeof s === 'string' && IDENT.test(s)) out += `.${s}`;
    else out += `[${JSON.stringify(String(s))}]`;
  }
  return out;
}

/** Joins a base JSON path (e.g. `$.entities[2]`) with more segments. */
export function joinJsonPath(base: string, segments: readonly PropertyKey[]): string {
  return formatJsonPath(segments, base);
}
