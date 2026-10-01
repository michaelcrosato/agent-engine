/** A typed event channel. Payload type is carried in the type parameter only. */
export type EventType<T = unknown> = {
  readonly kind: 'event';
  readonly name: string;
  readonly doc: string;
  /** Phantom field for type inference; never set. */
  readonly payload?: T;
};

export type EventPayload<E> = E extends EventType<infer T> ? T : never;

/**
 * Defines an event channel:
 *
 *   export const Died = defineEvent<{ entity: Entity; by?: Entity }>('Died', 'An entity reached 0 health.');
 */
export function defineEvent<T>(name: string, doc: string): EventType<T> {
  return { kind: 'event', name, doc };
}
