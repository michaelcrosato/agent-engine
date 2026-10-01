import { z } from 'zod';
import { defineContentKind } from '../content/defineContentKind.ts';

/**
 * Input bindings: action name → device inputs.
 * Keys use KeyboardEvent.code ("KeyW", "Space", "ShiftLeft", "Digit1").
 * Mouse: "Mouse0" (left), "Mouse1" (middle), "Mouse2" (right), "WheelUp", "WheelDown".
 * Gamepad (standard mapping): "Pad:A", "Pad:B", "Pad:X", "Pad:Y", "Pad:LB", "Pad:RB", "Pad:LT", "Pad:RT",
 * "Pad:Back", "Pad:Start", "Pad:LS", "Pad:RS", "Pad:Up", "Pad:Down", "Pad:Left", "Pad:Right",
 * and stick directions "Pad:LeftX+", "Pad:LeftX-", "Pad:LeftY+", "Pad:LeftY-" (Y+ is down).
 */
export const InputMapSchema = z
  .object({
    doc: z.string().default(''),
    actions: z.record(z.string(), z.array(z.string())).meta({ description: 'Action → list of bindings' }),
    mouse: z
      .object({
        sensitivity: z.number().positive().default(0.12).meta({ description: 'Degrees per pixel' }),
        invertY: z.boolean().default(false),
      })
      .strict()
      .prefault({}),
    gamepad: z
      .object({
        lookSpeed: z
          .number()
          .positive()
          .default(180)
          .meta({ description: 'Degrees per second at full stick' }),
        deadzone: z.number().min(0).max(0.9).default(0.15),
        invertY: z.boolean().default(false),
      })
      .strict()
      .prefault({}),
  })
  .strict();

export type InputMapData = z.output<typeof InputMapSchema>;

export const InputMapKind = defineContentKind({
  name: 'input',
  folder: 'input',
  doc: 'Input map: named actions bound to keys, mouse buttons, and gamepad controls.',
  schema: InputMapSchema,
});
