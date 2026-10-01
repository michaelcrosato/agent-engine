export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = { level: LogLevel; msg: string; tick: number };

/**
 * Compact logger. Keeps a ring of recent entries for tools and the debug console;
 * repeated identical messages are counted instead of printed again.
 */
export class Log {
  readonly entries: LogEntry[] = [];
  private readonly seen = new Map<string, number>();
  tick = 0;
  private readonly sink: (e: LogEntry) => void;
  private readonly max: number;

  constructor(sink: (e: LogEntry) => void = () => {}, max = 500) {
    this.sink = sink;
    this.max = max;
  }

  debug(msg: string): void {
    this.write('debug', msg);
  }
  info(msg: string): void {
    this.write('info', msg);
  }
  warn(msg: string): void {
    this.write('warn', msg);
  }
  error(msg: string): void {
    this.write('error', msg);
  }

  /** Like `warn`, but only the first time a given key is seen (for per-tick warnings). */
  once(key: string, msg: string, level: LogLevel = 'warn'): void {
    const n = this.seen.get(key) ?? 0;
    this.seen.set(key, n + 1);
    if (n === 0) this.write(level, msg);
  }

  private write(level: LogLevel, msg: string): void {
    const e = { level, msg, tick: this.tick };
    this.entries.push(e);
    if (this.entries.length > this.max) this.entries.splice(0, this.entries.length - this.max);
    this.sink(e);
  }
}

/** Sink that prints to the console with a level prefix. */
export function consoleSink(minLevel: LogLevel = 'info'): (e: LogEntry) => void {
  const order: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  return (e) => {
    if (order.indexOf(e.level) < order.indexOf(minLevel)) return;
    const line = `[${e.level}] ${e.msg}`;
    if (e.level === 'error') console.error(line);
    else if (e.level === 'warn') console.warn(line);
    else console.log(line);
  };
}
