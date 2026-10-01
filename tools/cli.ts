import { EngineError } from '../engine/core/EngineError.ts';
import { didYouMean } from '../engine/core/suggest.ts';
import { formatResult } from './lib/formatResult.ts';
import { ROOT } from './lib/outPath.ts';
import { parseArgs, toolHelp } from './lib/parseArgs.ts';
import { TOOLS } from './tools.ts';

/**
 * CLI entry: `node tools/cli.ts <tool> [args] [--json] [--help]`. npm scripts wrap the common
 * tools (`npm run play -- ...`). Prints a compact summary; exits 1 on failure.
 */
async function main(argv: string[]): Promise<number> {
  const [name, ...rest] = argv;
  if (!name || name === 'help' || name === '--help') {
    console.log(
      [
        'Tools (npm run tool -- <name> --help for details):',
        ...TOOLS.map((t) => `  ${t.name.padEnd(10)} ${t.summary}`),
      ].join('\n'),
    );
    return 0;
  }
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    console.error(
      new EngineError({
        code: 'TOOL_UNKNOWN',
        what: `No tool "${name}"`,
        why: didYouMean(
          name,
          TOOLS.map((t) => t.name),
        ),
        fix: 'npm run tool -- help',
      }).message,
    );
    return 1;
  }
  if (rest.includes('--help')) {
    console.log(toolHelp(tool));
    return 0;
  }
  const json = rest.includes('--json');
  try {
    const args = parseArgs(
      tool,
      rest.filter((a) => a !== '--json'),
    );
    const result = await tool.run(args, { root: ROOT, progress: (m) => console.error(`… ${m}`) });
    console.log(formatResult(result, { json }));
    return result.ok ? 0 : 1;
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
