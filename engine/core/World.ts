import type { ComponentData, ComponentInput, ComponentType } from './defineComponent.ts';
import { EngineError } from './EngineError.ts';
import { didYouMean } from './suggest.ts';

/** Entities are plain numeric ids. Ids are never reused within a World. */
export type Entity = number;

export type SpawnOpts = {
  name?: string;
  tags?: readonly string[];
  prefab?: string;
  /** Where it was defined in its room file: `entities[3]`, `grid[col,row]` (glyph), `grid` (geometry). */
  source?: string;
};

/**
 * Entity + component storage. Components are plain data keyed by component type.
 * `destroy` is deferred: the entity stops matching queries immediately, and its data is
 * dropped at the end of the tick by `flush()`, so systems can still read final state.
 */
export class World {
  private next = 1;
  private readonly alive = new Set<Entity>();
  private readonly doomed = new Set<Entity>();
  private readonly stores = new Map<ComponentType, Map<Entity, unknown>>();
  private readonly byName = new Map<string, Entity>();
  private readonly names = new Map<Entity, string>();
  private readonly tags = new Map<Entity, Set<string>>();
  private readonly prefabs = new Map<Entity, string>();
  private readonly sources = new Map<Entity, string>();

  spawn(opts: SpawnOpts = {}): Entity {
    const e = this.next++;
    this.alive.add(e);
    if (opts.name) this.setName(e, opts.name);
    if (opts.tags?.length) this.tag(e, ...opts.tags);
    if (opts.prefab) this.prefabs.set(e, opts.prefab);
    if (opts.source) this.sources.set(e, opts.source);
    return e;
  }

  /** Adds (or replaces) a component from JSON-form input; defaults fill missing fields. */
  add<C extends ComponentType>(e: Entity, type: C, input?: ComponentInput<C>): ComponentData<C> {
    const data = type.create(input ?? {}, { entity: this.label(e) }) as ComponentData<C>;
    this.attach(e, type, data);
    return data;
  }

  /** Stores already-built runtime data (from `type.create`) without re-validating. */
  attach<C extends ComponentType>(e: Entity, type: C, data: ComponentData<C>): void {
    let store = this.stores.get(type);
    if (!store) this.stores.set(type, (store = new Map()));
    store.set(e, data);
  }

  get<C extends ComponentType>(e: Entity, type: C): ComponentData<C> | undefined {
    return this.stores.get(type)?.get(e) as ComponentData<C> | undefined;
  }

  /** Like `get`, but throws a teaching error when the component is missing. */
  need<C extends ComponentType>(e: Entity, type: C, by = 'caller'): ComponentData<C> {
    const data = this.get(e, type);
    if (data !== undefined) return data;
    const has = this.componentsOf(e).map((c) => c.name);
    throw new EngineError({
      code: 'COMPONENT_MISSING',
      what: `${by} needs component ${type.name} on ${this.label(e)}`,
      where: { entity: this.label(e), component: type.name },
      why: this.isAlive(e) ? `Entity has: ${has.join(', ') || '(nothing)'}.` : 'Entity is destroyed.',
      fix: `Add "${type.name}" to the prefab's components, or check has() before need().`,
    });
  }

  has(e: Entity, type: ComponentType): boolean {
    return this.stores.get(type)?.has(e) ?? false;
  }

  remove(e: Entity, type: ComponentType): void {
    this.stores.get(type)?.delete(e);
  }

  /** Marks for destruction at end of tick. The entity stops matching queries right away. */
  destroy(e: Entity): void {
    if (this.alive.has(e)) this.doomed.add(e);
  }

  isAlive(e: Entity): boolean {
    return this.alive.has(e) && !this.doomed.has(e);
  }

  /** Drops data of destroyed entities. Called by the engine at the end of each tick. */
  flush(): Entity[] {
    const gone = [...this.doomed];
    for (const e of gone) {
      for (const store of this.stores.values()) store.delete(e);
      const name = this.names.get(e);
      if (name !== undefined && this.byName.get(name) === e) this.byName.delete(name);
      this.names.delete(e);
      this.tags.delete(e);
      this.prefabs.delete(e);
      this.sources.delete(e);
      this.alive.delete(e);
    }
    this.doomed.clear();
    return gone;
  }

  /** Living entities that have every listed component. Returns a snapshot array. */
  query(...types: ComponentType[]): Entity[] {
    if (!types.length) return this.entities();
    const stores = types.map((t) => this.stores.get(t));
    if (stores.some((s) => !s)) return [];
    const sorted = (stores as Map<Entity, unknown>[]).sort((a, b) => a.size - b.size);
    const out: Entity[] = [];
    for (const e of sorted[0]!.keys()) {
      if (this.doomed.has(e)) continue;
      if (sorted.every((s) => s.has(e))) out.push(e);
    }
    return out;
  }

  /** First entity matching the query, or undefined. */
  first(...types: ComponentType[]): Entity | undefined {
    return this.query(...types)[0];
  }

  entities(): Entity[] {
    return [...this.alive].filter((e) => !this.doomed.has(e));
  }

  componentsOf(e: Entity): ComponentType[] {
    const out: ComponentType[] = [];
    for (const [type, store] of this.stores) if (store.has(e)) out.push(type);
    return out;
  }

  get size(): number {
    return this.alive.size - this.doomed.size;
  }

  setName(e: Entity, name: string): void {
    const existing = this.byName.get(name);
    if (existing !== undefined && existing !== e && this.isAlive(existing)) {
      throw new EngineError({
        code: 'ENTITY_NAME_TAKEN',
        what: `Entity name "${name}" is already used by ${this.label(existing)}`,
        why: 'Entity names must be unique so signals and tests can address them.',
        fix: 'Give one of them a different "name" in the room file.',
      });
    }
    this.byName.set(name, e);
    this.names.set(e, name);
  }

  nameOf(e: Entity): string | undefined {
    return this.names.get(e);
  }

  /** Entity by unique name, or undefined. */
  named(name: string): Entity | undefined {
    const e = this.byName.get(name);
    return e !== undefined && this.isAlive(e) ? e : undefined;
  }

  /** Entity by unique name; throws a teaching error listing similar names. */
  needNamed(name: string): Entity {
    const e = this.named(name);
    if (e !== undefined) return e;
    throw new EngineError({
      code: 'ENTITY_NOT_FOUND',
      what: `No living entity named "${name}"`,
      why: didYouMean(
        name,
        [...this.byName.keys()].filter((n) => this.named(n) !== undefined),
      ),
      fix: 'Check the "name" fields in the room file, or list entities with: npm run play -- <game>/<room> --list',
    });
  }

  tag(e: Entity, ...tags: string[]): void {
    let set = this.tags.get(e);
    if (!set) this.tags.set(e, (set = new Set()));
    for (const t of tags) set.add(t);
  }

  untag(e: Entity, tag: string): void {
    this.tags.get(e)?.delete(tag);
  }

  hasTag(e: Entity, tag: string): boolean {
    return this.tags.get(e)?.has(tag) ?? false;
  }

  tagsOf(e: Entity): string[] {
    return [...(this.tags.get(e) ?? [])];
  }

  /** Living entities carrying `tag`. */
  tagged(tag: string): Entity[] {
    const out: Entity[] = [];
    for (const [e, set] of this.tags) if (set.has(tag) && this.isAlive(e)) out.push(e);
    return out;
  }

  prefabOf(e: Entity): string | undefined {
    return this.prefabs.get(e);
  }

  /** Where the entity was defined in its room file (see SpawnOpts.source); undefined for runtime spawns. */
  sourceOf(e: Entity): string | undefined {
    return this.sources.get(e);
  }

  /** Human/agent-readable entity label for errors and logs: `grunt#12 "boss"`. */
  label(e: Entity): string {
    const name = this.names.get(e);
    const prefab = this.prefabs.get(e) ?? 'entity';
    return `${prefab}#${e}${name ? ` "${name}"` : ''}`;
  }
}
