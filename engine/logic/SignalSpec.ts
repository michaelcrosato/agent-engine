import { z } from 'zod';

/** One thing a trigger/counter/timer does: send a signal and/or show a message, optionally delayed. */
export const SignalSpecSchema = z
  .object({
    target: z.string().default('').meta({ description: 'Entity name or "#tag"; empty = no signal' }),
    action: z
      .string()
      .default('toggle')
      .meta({ description: 'open, close, toggle, start, stop, on, off, spawn, add, ...' }),
    value: z.number().default(0),
    delay: z.number().min(0).default(0).meta({ description: 'Seconds to wait before sending' }),
    message: z.string().default('').meta({ description: 'Text to show on the HUD' }),
  })
  .strict();

export type SignalSpec = z.output<typeof SignalSpecSchema>;
