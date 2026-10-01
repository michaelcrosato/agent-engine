import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { formatResult } from '../lib/formatResult.ts';
import { ROOT } from '../lib/outPath.ts';
import { TOOLS } from '../tools.ts';

/**
 * MCP server exposing every CLI tool (same names, same zod argument schemas) over stdio.
 * Registered for Claude Code in .mcp.json; run manually with `npm run mcp`.
 */
export async function startMcpServer(): Promise<void> {
  const server = new McpServer({ name: 'agent-engine', version: '0.1.0' });
  for (const tool of TOOLS) {
    server.registerTool(
      `engine_${tool.name}`,
      { title: tool.name, description: `${tool.summary}\n\n${tool.usage}`, inputSchema: tool.args },
      async (args: unknown) => {
        try {
          const result = await tool.run(tool.args.parse(args), { root: ROOT, progress: () => {} });
          const text = formatResult(result);
          const details = result.details !== undefined ? JSON.stringify(result.details) : '';
          return {
            content: [
              {
                type: 'text' as const,
                text: details && details.length < 6000 ? `${text}\n\ndetails: ${details}` : text,
              },
            ],
            isError: !result.ok,
          };
        } catch (err) {
          return {
            content: [{ type: 'text' as const, text: err instanceof Error ? err.message : String(err) }],
            isError: true,
          };
        }
      },
    );
  }
  await server.connect(new StdioServerTransport());
}

await startMcpServer();
