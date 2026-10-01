import { EngineError } from '../core/EngineError.ts';
import { formatJsonPath } from '../schema/jsonPath.ts';

export type JsonPos = { line: number; col: number };

/** Parsed JSON plus the source position of every value, keyed by JSON path (`$.a[0].b`). */
export type ParsedJson = {
  value: unknown;
  positions: Map<string, JsonPos>;
  /** Position of a path, falling back to the closest parent that has one. */
  locate(path: string): JsonPos | undefined;
};

class Cursor {
  i = 0;
  private readonly lineStarts: number[] = [0];
  readonly text: string;
  readonly file: string;

  constructor(text: string, file: string) {
    this.text = text;
    this.file = file;
    for (let k = 0; k < text.length; k++) if (text[k] === '\n') this.lineStarts.push(k + 1);
  }

  pos(at = this.i): JsonPos {
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.lineStarts[mid]! <= at) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: at - this.lineStarts[lo]! + 1 };
  }

  fail(what: string, fix: string, at = this.i): never {
    const p = this.pos(at);
    const src = this.text.split('\n')[p.line - 1] ?? '';
    throw new EngineError({
      code: 'JSON_SYNTAX',
      what: `Invalid JSON: ${what}`,
      where: { file: this.file, line: p.line, col: p.col },
      why: `\n    ${src}\n    ${' '.repeat(Math.max(0, p.col - 1))}^`,
      fix,
    });
  }

  ws(): void {
    const t = this.text;
    while (this.i < t.length) {
      const c = t[this.i]!;
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') this.i++;
      else if (c === '/' && (t[this.i + 1] === '/' || t[this.i + 1] === '*')) {
        this.fail('comments are not allowed', 'Remove the comment; put notes in a "doc" field instead.');
      } else break;
    }
  }
}

function parseString(c: Cursor): string {
  const start = c.i;
  if (c.text[c.i] === "'")
    c.fail('single-quoted string', 'JSON strings and keys use double quotes: "like this".');
  c.i++;
  let out = '';
  while (c.i < c.text.length) {
    const ch = c.text[c.i]!;
    if (ch === '"') {
      c.i++;
      return out;
    }
    if (ch === '\n') c.fail('unterminated string', 'Close the string with " before the line ends.', start);
    if (ch === '\\') {
      const end = c.i + 2 + (c.text[c.i + 1] === 'u' ? 4 : 0);
      out += JSON.parse(`"${c.text.slice(c.i, end)}"`) as string;
      c.i = end;
      continue;
    }
    out += ch;
    c.i++;
  }
  return c.fail('unterminated string', 'Close the string with ".', start);
}

function parseValue(c: Cursor, path: PropertyKey[], positions: Map<string, JsonPos>): unknown {
  c.ws();
  const t = c.text;
  const ch = t[c.i];
  if (!positions.has(formatJsonPath(path))) positions.set(formatJsonPath(path), c.pos());
  if (ch === '{') {
    c.i++;
    const obj: Record<string, unknown> = {};
    c.ws();
    if (t[c.i] === '}') {
      c.i++;
      return obj;
    }
    for (;;) {
      c.ws();
      if (t[c.i] === '}') c.fail('trailing comma before "}"', 'Remove the comma after the last field.');
      if (t[c.i] !== '"' && t[c.i] !== "'") c.fail('expected a "quoted" key', 'Keys must be double-quoted.');
      const keyAt = c.pos();
      const key = parseString(c);
      positions.set(formatJsonPath([...path, key]), keyAt);
      c.ws();
      if (t[c.i] !== ':') c.fail(`expected ":" after key "${key}"`, 'Write "key": value.');
      c.i++;
      obj[key] = parseValue(c, [...path, key], positions);
      c.ws();
      if (t[c.i] === ',') {
        c.i++;
        continue;
      }
      if (t[c.i] === '}') {
        c.i++;
        return obj;
      }
      c.fail(
        'expected "," or "}"',
        'Separate fields with commas; check for a missing comma on the previous line.',
      );
    }
  }
  if (ch === '[') {
    c.i++;
    const arr: unknown[] = [];
    c.ws();
    if (t[c.i] === ']') {
      c.i++;
      return arr;
    }
    for (;;) {
      c.ws();
      if (t[c.i] === ']') c.fail('trailing comma before "]"', 'Remove the comma after the last item.');
      arr.push(parseValue(c, [...path, arr.length], positions));
      c.ws();
      if (t[c.i] === ',') {
        c.i++;
        continue;
      }
      if (t[c.i] === ']') {
        c.i++;
        return arr;
      }
      c.fail('expected "," or "]"', 'Separate items with commas.');
    }
  }
  if (ch === '"' || ch === "'") return parseString(c);
  const m = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(t.slice(c.i, c.i + 64));
  if (!m) {
    if (c.i >= t.length) c.fail('unexpected end of file', 'A bracket or brace is not closed.');
    c.fail(`unexpected "${t[c.i]}"`, 'Values must be numbers, strings, true/false/null, objects, or arrays.');
  }
  c.i += m[0].length;
  return JSON.parse(m[0]);
}

/** Parses JSON text, recording source positions. Throws EngineError JSON_SYNTAX with a code frame. */
export function parseJson(text: string, file: string): ParsedJson {
  const c = new Cursor(text, file);
  const positions = new Map<string, JsonPos>();
  const value = parseValue(c, [], positions);
  c.ws();
  if (c.i < text.length)
    c.fail('extra content after the top-level value', 'A file holds exactly one JSON value.');
  return {
    value,
    positions,
    locate(path: string) {
      let p = path;
      for (;;) {
        const hit = positions.get(p);
        if (hit) return hit;
        const cut = Math.max(p.lastIndexOf('.'), p.lastIndexOf('['));
        if (cut <= 0) return positions.get('$');
        p = p.slice(0, cut);
      }
    },
  };
}
