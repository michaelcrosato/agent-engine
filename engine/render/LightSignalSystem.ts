import { defineSystem } from '../core/defineSystem.ts';
import { Signal } from '../logic/Signal.ts';
import { Light } from './Light.ts';

/** "on", "off", and "toggle" signals switch Light.on (runs headless; LightSystem draws it). */
export const LightSignalSystem = defineSystem({
  name: 'LightSignalSystem',
  doc: 'Switches lights with on/off/toggle signals.',
  phase: 'update',
  run(ctx) {
    for (const s of ctx.events.read(Signal)) {
      const l = ctx.world.get(s.target, Light);
      if (!l) continue;
      if (s.action === 'on' || s.action === 'off') l.on = s.action === 'on';
      else if (s.action === 'toggle') l.on = !l.on;
    }
  },
});
