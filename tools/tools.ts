import { apiTool } from './commands/api.ts';
import { checkTool } from './commands/check.ts';
import { describeTool } from './commands/describe.ts';
import { docsTool } from './commands/docs.ts';
import { listTool } from './commands/list.ts';
import { mapTool } from './commands/map.ts';
import { musicTool } from './commands/music.ts';
import { newTool } from './commands/new.ts';
import { playTool } from './commands/play.ts';
import { schemasTool } from './commands/schemas.ts';
import { sfxTool } from './commands/sfx.ts';
import { shotTool } from './commands/shot.ts';
import { texTool } from './commands/tex.ts';
import { validateTool } from './commands/validate.ts';
import type { ToolDef } from './lib/defineTool.ts';

/** Every tool, available as `npm run tool -- <name>` and over MCP. `npm run new -- tool <name>` adds to it. */
export const TOOLS: readonly ToolDef[] = [
  checkTool,
  newTool,
  docsTool,
  apiTool,
  listTool,
  describeTool,
  validateTool,
  mapTool,
  playTool,
  shotTool,
  sfxTool,
  musicTool,
  texTool,
  schemasTool,
];
