import type { GameDef } from './defineGame.ts';
import { EngineError } from './EngineError.ts';

/** Checks plugin lists for duplicates and ordering problems before anything runs. */
export function validatePlugins(game: GameDef): void {
  const where = { file: `games/${game.name}/game.ts` };
  const seen = new Set<string>();
  const components = new Map<string, string>();
  const systems = new Map<string, string>();
  for (const p of game.plugins) {
    if (seen.has(p.name)) {
      throw new EngineError({
        code: 'PLUGIN_DUPLICATE',
        what: `Plugin "${p.name}" is listed twice`,
        where,
        fix: 'Remove the duplicate from the plugins array (standardPlugins() may already include it).',
      });
    }
    for (const r of p.requires) {
      if (!seen.has(r)) {
        throw new EngineError({
          code: 'PLUGIN_REQUIRES',
          what: `Plugin "${p.name}" requires "${r}" earlier in the plugin list`,
          where,
          fix: `Add the "${r}" plugin before "${p.name}".`,
        });
      }
    }
    seen.add(p.name);
    for (const c of p.components) {
      const owner = components.get(c.name);
      if (owner && owner !== p.name) {
        throw new EngineError({
          code: 'COMPONENT_DUPLICATE',
          what: `Component "${c.name}" is registered by both "${owner}" and "${p.name}"`,
          where,
          fix: 'Register each component in exactly one plugin; import it elsewhere instead.',
        });
      }
      components.set(c.name, p.name);
    }
    for (const s of p.systems) {
      const owner = systems.get(s.name);
      if (owner) {
        throw new EngineError({
          code: 'SYSTEM_DUPLICATE',
          what: `System "${s.name}" is registered by both "${owner}" and "${p.name}"`,
          where,
          fix: 'System names must be unique; rename one of them.',
        });
      }
      systems.set(s.name, p.name);
    }
  }
}
