import { defineComponent } from '../../core/defineComponent.ts';
import { SignalSpecSchema } from '../../logic/SignalSpec.ts';
import { field } from '../../schema/field.ts';

/** Shooting-range target: falls when its Health runs out, scores, and pops back up. */
export const Target = defineComponent({
  name: 'Target',
  doc: 'Knock-down target that scores points and resets (needs Health with destroyOnDeath false).',
  schema: {
    points: field.int(10),
    resetTime: field.number(2.5, { min: 0, unit: 's', doc: '0 = stays down' }),
    onHit: field.list(SignalSpecSchema, []),
    down: field.bool(false, { doc: 'State' }),
    downAt: field.number(0, { doc: 'State' }),
    hits: field.int(0, { doc: 'State: times knocked down' }),
  },
});
