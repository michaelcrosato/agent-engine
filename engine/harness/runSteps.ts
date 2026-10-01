import { Vector3 } from 'three';
import { z } from 'zod';
import type { Playtest } from './Playtest.ts';

const target = z.union([z.string(), z.tuple([z.number(), z.number(), z.number()])]);

/**
 * One scripted playtest step (JSON). The same vocabulary as the Playtest API, so agents can
 * drive a room from the CLI (`npm run play -- game/room --steps '[...]'`) or MCP.
 */
export const StepSchema = z.union([
  z.object({ wait: z.number().min(0) }).strict(),
  z.object({ hold: z.string(), seconds: z.number().min(0) }).strict(),
  z.object({ press: z.string() }).strict(),
  z.object({ look: z.tuple([z.number(), z.number()]) }).strict(),
  z.object({ lookAt: target }).strict(),
  z.object({ walkTo: target, timeout: z.number().default(20) }).strict(),
  z.object({ untilEvent: z.string(), timeout: z.number().default(10) }).strict(),
  z.object({ signal: z.tuple([z.string(), z.string()]) }).strict(),
  z.object({ teleport: z.tuple([z.number(), z.number(), z.number()]) }).strict(),
  z.object({ capture: z.string() }).strict(),
]);

export const StepsSchema = z.array(StepSchema);
export type Step = z.output<typeof StepSchema>;

export type StepLog = { step: number; did: string; ok: boolean; t: number };

const point = (t: string | [number, number, number]) => (typeof t === 'string' ? t : new Vector3(...t));

/** Runs steps in order; `capture` is called for capture steps (the Node harness writes files). */
export function runSteps(
  t: Playtest,
  steps: readonly Step[],
  capture?: (label: string) => string,
): StepLog[] {
  const log: StepLog[] = [];
  steps.forEach((s, i) => {
    let did = '';
    let ok = true;
    if ('wait' in s) {
      t.wait(s.wait);
      did = `wait ${s.wait}s`;
    } else if ('hold' in s) {
      t.hold(s.hold, s.seconds);
      did = `hold ${s.hold} ${s.seconds}s`;
    } else if ('press' in s) {
      t.press(s.press);
      did = `press ${s.press}`;
    } else if ('look' in s) {
      t.look(s.look[0], s.look[1]);
      did = `look ${s.look.join(',')}`;
    } else if ('lookAt' in s) {
      t.lookAt(point(s.lookAt));
      did = `lookAt ${JSON.stringify(s.lookAt)}`;
    } else if ('walkTo' in s) {
      ok = t.walkTo(point(s.walkTo), { timeout: s.timeout });
      did = `walkTo ${JSON.stringify(s.walkTo)} ${ok ? 'arrived' : 'FAILED (timeout)'}`;
    } else if ('untilEvent' in s) {
      const before = t.events(s.untilEvent).length;
      ok = t.until(() => t.events(s.untilEvent).length > before, s.timeout);
      did = `until ${s.untilEvent} ${ok ? 'seen' : 'NOT seen'}`;
    } else if ('signal' in s) {
      t.signal(s.signal[0], s.signal[1]);
      did = `signal ${s.signal.join(' ')}`;
    } else if ('teleport' in s) {
      t.engine.physics.teleport(t.player, new Vector3(...s.teleport));
      t.tick();
      did = `teleport ${s.teleport.join(',')}`;
    } else if ('capture' in s) {
      did = `capture ${capture ? capture(s.capture) : s.capture}`;
    }
    log.push({ step: i, did, ok, t: Math.round(t.seconds * 100) / 100 });
  });
  return log;
}
