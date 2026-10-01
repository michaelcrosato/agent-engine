import { definePlugin } from '../../core/definePlugin.ts';
import { Explosive } from './Explosive.ts';
import { Exploded } from './explode.ts';
import { Projectile } from './Projectile.ts';
import { ProjectileSystem } from './ProjectileSystem.ts';

/** Projectiles, explosions (explode helper), and Explosive props. */
export const ProjectilesPlugin = definePlugin({
  name: 'projectiles',
  doc: 'Projectile flight and impacts, explode(ctx, pos, opts), Explosive barrels.',
  components: [Projectile, Explosive],
  systems: [ProjectileSystem],
  events: [Exploded],
  requires: ['health'],
});
