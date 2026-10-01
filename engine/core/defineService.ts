/** Typed key for a plugin-provided service: `const NavKey = defineService<NavGrid>('nav')`. */
export type ServiceKey<T> = {
  readonly kind: 'service';
  readonly name: string;
  readonly doc: string;
  /** Phantom field for type inference; never set. */
  readonly type?: T;
};

export function defineService<T>(name: string, doc: string): ServiceKey<T> {
  return { kind: 'service', name, doc };
}
