import { z } from 'zod';
import { defineTool } from '../lib/defineTool.ts';

export const __camel__Tool = defineTool({
  name: '__name__',
  summary: '__doc__',
  usage: 'npm run tool -- __name__ <thing> [--flag value]\n  e.g. npm run tool -- __name__ example',
  args: z.object({
    thing: z.string().meta({ description: 'What to work on' }),
    flag: z.string().default('').meta({ description: 'Example option' }),
  }),
  positional: ['thing'],
  async run(a, io) {
    io.progress(`working on ${a.thing}`);
    return { ok: true, summary: `__name__: did something with ${a.thing}` };
  },
});
