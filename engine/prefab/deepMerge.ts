type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Merges JSON-form data: objects merge key by key, everything else (numbers, strings, arrays)
 * is replaced by the later value. Inputs are never mutated.
 */
export function deepMerge(...layers: readonly (Json | undefined)[]): Json {
  const out: Json = {};
  for (const layer of layers) {
    if (!layer) continue;
    for (const [k, v] of Object.entries(layer)) {
      out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k] as Json, v) : structuredClone(v);
    }
  }
  return out;
}
