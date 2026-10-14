import { defineComponent } from '../../core/defineComponent.ts';
import { field } from '../../schema/field.ts';

export const Traversal = defineComponent({
  name: 'Traversal',
  doc: 'Optional air jump, directional dash, momentum slide and low-ledge mantle for the FPS controller.',
  schema: {
    dashCooldown: field.number(2.2, { min: 0.1 }),
    dashSpeed: field.number(24, { min: 0 }),
    airJumps: field.int(1, { min: 0, max: 5 }),
    standingHeight: field.number(1.8, { min: 1 }),
    crouchingHeight: field.number(1.05, { min: 0.8 }),
    cooldown: field.number(0, { doc: 'State: dash cooldown remaining' }),
    dashing: field.number(0, { doc: 'State: dash seconds remaining' }),
    sliding: field.number(0, { doc: 'State: slide seconds remaining' }),
    jumpsUsed: field.int(0, { doc: 'State: jumps used since leaving ground' }),
    actionTime: field.number(0, { doc: 'State: seconds left in an ability animation' }),
    actionClip: field.string('cast', { doc: 'Animation role used while actionTime is positive' }),
    direction: field.vec3(0, { doc: 'State: dash/slide direction' }),
  },
});
