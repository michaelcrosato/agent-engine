import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NearestFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
} from 'three';
import type { ContentStore } from '../content/ContentStore.ts';
import { renderTexture } from '../gen/texture/renderTexture.ts';
import { TextureKind } from '../gen/texture/TextureRecipe.ts';

export type TextureSet = {
  map: DataTexture;
  normalMap: DataTexture | undefined;
  roughnessMap: DataTexture;
  emissiveMap: DataTexture | undefined;
};

function tex(px: Uint8ClampedArray, size: number, srgb: boolean, pixelated: boolean): DataTexture {
  const t = new DataTexture(px, size, size, RGBAFormat);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.magFilter = pixelated ? NearestFilter : LinearFilter;
  t.minFilter = pixelated ? NearestFilter : LinearMipmapLinearFilter;
  t.generateMipmaps = !pixelated;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Generates GPU textures from recipes on first use and keeps them until invalidated. */
export class TextureCache {
  private readonly sets = new Map<string, TextureSet>();
  private readonly content: ContentStore;

  constructor(content: ContentStore) {
    this.content = content;
  }

  get(id: string, pixelated = false): TextureSet {
    const key = `${id}|${pixelated}`;
    let set = this.sets.get(key);
    if (set) return set;
    const maps = renderTexture(this.content.get(TextureKind, id));
    set = {
      map: tex(maps.albedo, maps.size, true, pixelated),
      normalMap: maps.normal ? tex(maps.normal, maps.size, false, pixelated) : undefined,
      roughnessMap: tex(maps.roughness, maps.size, false, pixelated),
      emissiveMap: maps.emissive ? tex(maps.emissive, maps.size, true, pixelated) : undefined,
    };
    this.sets.set(key, set);
    return set;
  }

  /** Drops cached textures for a recipe id (hot reload), or everything. */
  invalidate(id?: string): void {
    for (const [key, set] of this.sets) {
      if (id && !key.startsWith(`${id}|`)) continue;
      for (const t of Object.values(set)) t?.dispose();
      this.sets.delete(key);
    }
  }
}
