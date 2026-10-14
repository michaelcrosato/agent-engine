import type { VisualFilter } from '#engine/api.ts';

const styles = [
  ['cel', 'Cel shaded', 'Banded light & clean ink edges.'],
  ['graphic', 'Graphic novel', 'Warm print, bold ink & halftone.'],
  ['vivid', 'Vivid', 'Richer color & warm highlights.'],
  ['none', 'Original', 'The unfiltered lighting.'],
] as const;
const scopes = [
  ['scene', 'Entire scene'],
  ['environment', 'Environment'],
  ['subjects', 'Characters & objects'],
] as const;

export function visualFilterMarkup(filter: VisualFilter): string {
  return `<section class="rift-visuals" aria-label="Visual filters">
    <div class="rift-eyebrow">ART DIRECTION</div><h3>See the rift your way.</h3>
    <p>Preview changes in the world. Your look follows you into every expedition.</p>
    <div class="rift-filter-styles" role="group" aria-label="Filter style">${styles
      .map(
        ([id, title, caption]) =>
          `<button data-action="filter-style" data-id="${id}" aria-pressed="${filter.style === id}"><span class="rift-swatch rift-swatch-${id}" aria-hidden="true"></span><b>${title}</b><small>${caption}</small></button>`,
      )
      .join('')}</div>
    <h4>Apply to</h4><div class="rift-filter-scopes" role="group" aria-label="Filter scope">${scopes
      .map(
        ([id, title]) =>
          `<button class="rift-quiet" data-action="filter-scope" data-id="${id}" aria-pressed="${filter.scope === id}">${title}</button>`,
      )
      .join('')}</div>
    <p class="rift-small">Environment includes terrain, buildings and vegetation. Characters & objects includes the runner, monsters, gear, crates and interactive props.</p>
    <button class="rift-quiet" data-action="filter-default">Restore cel shaded default</button>
  </section>`;
}
