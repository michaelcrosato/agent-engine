import { defineComponent, field, z } from '#engine/api.ts';

export const RiftEnemy = defineComponent({
  name: 'RiftEnemy',
  doc: 'A monster sentence: chassis + behavior + element + affix + optional boss patterns.',
  schema: {
    title: field.string('Rift creature'),
    behavior: field.enum(['stalker', 'gunner', 'charger', 'orbiter'], 'stalker'),
    modifier: field.enum(['none', 'swift', 'armored', 'volatile', 'vampiric'], 'none'),
    speed: field.number(4, { min: 0 }),
    damage: field.number(15, { min: 0 }),
    baseHealth: field.number(80, { min: 1 }),
    boss: field.bool(false),
    patterns: field.list(z.enum(['shot', 'strike', 'nova']), ['shot', 'strike', 'nova']),
    cooldown: field.number(1, { doc: 'State' }),
    windup: field.number(0, { doc: 'State' }),
    aim: field.vec3(0, { doc: 'State: committed attack target' }),
    phase: field.int(0, { doc: 'State: attack pattern index' }),
    attack: field.string('', { doc: 'State: committed pattern' }),
  },
});
