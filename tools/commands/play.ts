import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { Transform } from '../../engine/core/Transform.ts';
import { runSteps, StepsSchema } from '../../engine/harness/runSteps.ts';
import { hp } from '../../engine/mechanics/health/applyDamage.ts';
import { Health } from '../../engine/mechanics/health/Health.ts';
import { playtest } from '../../engine/node/playtest.ts';
import { toJsonValue } from '../../engine/schema/toJsonValue.ts';
import { defineTool } from '../lib/defineTool.ts';
import { splitTarget } from '../lib/openGame.ts';

export const playTool = defineTool({
  name: 'play',
  summary: 'Run a room headlessly with scripted input steps; report events, player state, and a capture.',
  usage:
    'npm run play -- <game>/<room> [--seconds 3] [--steps \'[{"walkTo":"exit"}]\'] [--script file.json] [--capture end]\n' +
    '  steps: wait, hold+seconds, press, look:[dx,dy], lookAt, walkTo(+timeout), untilEvent, signal:[target,action],\n' +
    '         teleport, set:[entity,Component,field,value], capture\n' +
    '  e.g. npm run play -- fps-demo/range --steps \'[{"lookAt":"target-1"},{"press":"fire"},{"wait":0.5}]\'',
  args: z.object({
    target: z.string().meta({ description: 'game/room' }),
    seconds: z.number().min(0).default(0).meta({ description: 'Extra seconds to simulate after the steps' }),
    steps: z.string().optional().meta({ description: 'JSON array of steps' }),
    script: z.string().optional().meta({ description: 'Path to a JSON file with steps' }),
    capture: z.string().default('end').meta({ description: 'Label of the final capture ("" = none)' }),
    spawn: z.string().optional(),
    seed: z.number().int().default(1),
  }),
  positional: ['target'],
  async run(a) {
    const { game, rest: room } = splitTarget(a.target);
    const t = await playtest(game, room, { seed: a.seed, ...(a.spawn ? { spawn: a.spawn } : {}) });
    const raw = a.script ? readFileSync(a.script, 'utf8') : (a.steps ?? '[]');
    const steps = StepsSchema.parse(JSON.parse(raw));
    const files: string[] = [];
    const log = runSteps(t, steps, (label) => {
      const f = t.capture(label);
      files.push(f);
      return f;
    });
    if (a.seconds > 0) t.wait(a.seconds);
    if (a.capture) files.push(t.capture(a.capture));
    const counts = Object.entries(t.eventCounts());
    const p = t.engine.world.tagged('player')[0];
    const pt = p !== undefined ? t.engine.world.get(p, Transform) : undefined;
    const ph = p !== undefined ? t.engine.world.get(p, Health) : undefined;
    const msgs = t.events<{ text: string }>('Message').map((m) => m.text);
    const lines = [
      `${game}/${room}: ${t.seconds.toFixed(2)}s simulated, ${t.engine.world.size} entities`,
      ...log.map((l) => `  ${l.ok ? '✓' : '✖'} [${l.t}s] ${l.did}`),
      pt
        ? `player: pos ${JSON.stringify(toJsonValue(pt.pos, 2))} health ${ph ? Math.round(hp(ph)) : '-'}`
        : 'player: none',
      `events: ${
        counts
          .sort((x, y) => y[1] - x[1])
          .slice(0, 12)
          .map(([k, v]) => `${k}×${v}`)
          .join(' ') || 'none'
      }`,
      `sounds: ${t.sounds().length}${msgs.length ? `\nmessages: ${msgs.slice(-5).join(' | ')}` : ''}`,
    ];
    return {
      ok: log.every((l) => l.ok),
      summary: lines.join('\n'),
      files,
      details: { log, events: Object.fromEntries(counts) },
    };
  },
});
