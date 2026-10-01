/**
 * Writes a data file through the dev server (POST /__engine/save; see tools/vite/engineVitePlugin.ts).
 * The server validates the path, formats the JSON, and writes it; hot reload then echoes it back.
 */
export async function saveContentFile(path: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/__engine/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path, text }),
    });
    const body = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as {
      ok: boolean;
      error?: string;
    };
    return body;
  } catch {
    return { ok: false, error: 'Saving needs the dev server (npm run dev).' };
  }
}
