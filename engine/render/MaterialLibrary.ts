import {
  Color,
  DataTexture,
  DoubleSide,
  FrontSide,
  type Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
} from 'three';
import type { Log } from '../core/Log.ts';
import { didYouMean } from '../core/suggest.ts';
import { type MaterialData, MaterialSchema } from './Look.ts';
import type { TextureCache } from './TextureCache.ts';
import { type FilterGroup, usesCelLighting, type VisualFilter } from './VisualFilter.ts';

const MISSING = MaterialSchema.parse({ type: 'unlit', color: '#ff00ff' });
const FALLBACK = MaterialSchema.parse({ color: '#9a9a9a' });

/**
 * Turns the active look's named materials into Three materials (cached), applies tints,
 * and shows a magenta material plus a teaching log line for unknown names.
 */
export class MaterialLibrary {
  private defs: Record<string, MaterialData> = {};
  private readonly cache = new Map<string, Material>();
  private readonly textures: TextureCache;
  private readonly log: Log;
  private filter: VisualFilter = { style: 'none', scope: 'scene' };
  private gradient: DataTexture | undefined;

  constructor(textures: TextureCache, log: Log) {
    this.textures = textures;
    this.log = log;
  }

  /** Replaces the material palette (look change); cached materials are disposed. */
  setPalette(defs: Record<string, MaterialData>): void {
    this.defs = defs;
    this.clear();
  }

  setVisualFilter(filter: VisualFilter): void {
    this.filter = { ...filter };
    this.clear();
  }

  private clear(): void {
    for (const m of this.cache.values()) m.dispose();
    this.cache.clear();
    this.gradient?.dispose();
    this.gradient = undefined;
  }

  names(): string[] {
    return Object.keys(this.defs);
  }

  get(name: string, tint?: string, group: FilterGroup = 'subject'): Material {
    const cel = usesCelLighting(this.filter, group);
    const key = `${name}|${tint ?? ''}|${cel}`;
    let m = this.cache.get(key);
    if (m) return m;
    let def = this.defs[name];
    if (!def) {
      def = name === 'default' ? FALLBACK : MISSING;
      if (name !== 'default') {
        this.log.once(
          `material:${name}`,
          `Material "${name}" is not in the active look (shown magenta). ${didYouMean(name, this.names())} ` +
            'Add it to the look\'s "materials", or fix the part\'s "material".',
        );
      }
    }
    m = this.create(def, cel);
    if (tint && 'color' in m) (m as MeshStandardMaterial).color.multiply(new Color(tint));
    this.cache.set(key, m);
    return m;
  }

  private create(d: MaterialData, cel: boolean): Material {
    const tex = d.texture ? this.textures.get(d.texture, d.pixelated) : undefined;
    const side = d.doubleSided ? DoubleSide : FrontSide;
    const transparent = d.opacity < 1;
    if (d.type === 'unlit') {
      return new MeshBasicMaterial({
        color: d.color,
        map: tex?.map ?? null,
        side,
        transparent,
        opacity: d.opacity,
        depthWrite: !transparent,
      });
    }
    if (d.type === 'toon' || (cel && d.type === 'standard' && !transparent)) {
      if (cel && !this.gradient) {
        this.gradient = new DataTexture(new Uint8Array([0, 70, 155, 255]), 4, 1, RedFormat);
        this.gradient.minFilter = NearestFilter;
        this.gradient.magFilter = NearestFilter;
        this.gradient.generateMipmaps = false;
        this.gradient.needsUpdate = true;
      }
      return new MeshToonMaterial({
        color: d.color,
        map: tex?.map ?? null,
        gradientMap: cel ? this.gradient! : null,
        emissive: tex?.emissiveMap ? '#ffffff' : d.emissive,
        emissiveMap: tex?.emissiveMap ?? null,
        emissiveIntensity: d.emissiveIntensity,
        side,
        transparent,
        opacity: d.opacity,
        depthWrite: !transparent,
      });
    }
    const glow = d.type === 'glow';
    const glass = d.type === 'glass';
    return new MeshStandardMaterial({
      color: d.color,
      map: tex?.map ?? null,
      normalMap: tex?.normalMap ?? null,
      roughnessMap: tex?.roughnessMap ?? null,
      emissiveMap: tex?.emissiveMap ?? null,
      roughness: glass ? 0.05 : d.roughness,
      metalness: glass ? 0.9 : d.metalness,
      emissive: glow ? d.color : tex?.emissiveMap ? '#ffffff' : d.emissive,
      emissiveIntensity: glow ? Math.max(1, d.emissiveIntensity * 2) : d.emissiveIntensity,
      flatShading: d.flat,
      side,
      transparent: transparent || glass,
      opacity: glass ? Math.min(d.opacity, 0.35) : d.opacity,
      depthWrite: !(transparent || glass),
    });
  }
}
