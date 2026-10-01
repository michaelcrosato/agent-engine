import type { EventType } from './defineEvent.ts';

type Stored = { seq: number; tick: number; type: EventType; payload: unknown };
type Listener = (payload: unknown, type: EventType) => void;

/** What systems see as `ctx.events`: emit, plus exactly-once reads with a private cursor. */
export type EventView = {
  emit<T>(type: EventType<T>, payload: T): void;
  /** Events of `type` emitted since this reader last read that type (oldest first). */
  read<T>(type: EventType<T>): T[];
};

/**
 * Event log with per-reader cursors. Each system gets its own reader, so every system sees
 * every event exactly once no matter where it runs in the tick. Events are kept for a few
 * ticks and then pruned; listeners (`on`) fire synchronously on emit.
 */
export class EventBus {
  private seq = 0;
  private tick = 0;
  private log: Stored[] = [];
  private readonly listeners = new Map<EventType, Set<Listener>>();
  private readonly anyListeners = new Set<Listener>();

  emit<T>(type: EventType<T>, payload: T): void {
    this.log.push({ seq: ++this.seq, tick: this.tick, type: type as EventType, payload });
    for (const fn of this.listeners.get(type as EventType) ?? []) fn(payload, type as EventType);
    for (const fn of this.anyListeners) fn(payload, type as EventType);
  }

  /** Subscribes synchronously; returns an unsubscribe function. */
  on<T>(type: EventType<T>, fn: (payload: T) => void): () => void {
    let set = this.listeners.get(type as EventType);
    if (!set) this.listeners.set(type as EventType, (set = new Set()));
    const l = fn as Listener;
    set.add(l);
    return () => set.delete(l);
  }

  /** Subscribes to every event (used by the harness recorder and debug tools). */
  onAny(fn: (payload: unknown, type: EventType) => void): () => void {
    this.anyListeners.add(fn);
    return () => this.anyListeners.delete(fn);
  }

  /** Creates a reader with its own cursors. Starts at "now" so it never sees stale events. */
  view(): EventView {
    const cursors = new Map<EventType, number>();
    const start = this.seq;
    return {
      emit: (type, payload) => this.emit(type, payload),
      read: <T>(type: EventType<T>): T[] => {
        const from = cursors.get(type as EventType) ?? start;
        const out: T[] = [];
        for (let i = this.log.length - 1; i >= 0; i--) {
          const ev = this.log[i]!;
          if (ev.seq <= from) break;
          if (ev.type === type) out.push(ev.payload as T);
        }
        cursors.set(type as EventType, this.seq);
        return out.reverse();
      },
    };
  }

  /** Called by the engine at each tick start; drops events older than `keepTicks`. */
  beginTick(tick: number, keepTicks = 8): void {
    this.tick = tick;
    const cut = this.log.findIndex((ev) => ev.tick > tick - keepTicks);
    if (cut > 0) this.log = this.log.slice(cut);
    else if (cut === -1) this.log = [];
  }
}
