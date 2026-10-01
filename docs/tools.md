# Tools (CLI and MCP)

Every tool is defined once (`tools/commands/<name>.ts`, a zod argument schema plus `run`) and
served two ways: the CLI (`npm run tool -- <name> ...`, with short aliases for common ones) and
an MCP server (`.mcp.json`, tools named `engine_<name>` with the same arguments).

| Tool | Use it to |
| --- | --- |
| `check` | Run the one check: types, lint, architecture rules, content, schemas, tests. `--only types,tests`, `--fix` |
| `new` | Scaffold anything: `npm run new -- <kind> <name>` (see AGENTS.md) |
| `docs` | Read and search these docs |
| `api` | Look up real signatures in installed packages: `npm run api -- three PointLight` |
| `list` | List games, kinds, components, systems, plugins, events, or ids of a kind |
| `describe` | Fields of a component or kind, or a resolved prefab (`prefab:grunt`) |
| `validate` | Validate one game's data, references, and rooms (built headless) |
| `map` | A room as ASCII with rulers, glyphs, and entity cells |
| `play` | Run a room headless with scripted steps; report events and a capture |
| `shot` | Screenshot a room in headless Chromium (`--views player,top`, `--cam`/`--at`, `--look`, `--steps`) |
| `sfx` / `music` / `tex` | Render sounds, songs, textures to files and describe them |
| `schemas` | Regenerate JSON Schemas and reference docs (check does this too) |

Output is compact; files go to `out/` and are listed at the end of each result. Exit code is
non-zero when a tool fails, and the failure is a teaching error.

## Screenshots

`shot` starts the Vite dev server (or uses `--url`), opens headless Chromium with software
WebGL, simulates `--frames` ticks, then renders. Views: `player` (first person), `top`
(overhead of the whole room), `cam` (`--cam x,y,z --at x,y,z`). Read the PNGs to judge layout,
lighting, and readability. A few seconds per view.

## Adding a tool

`npm run new -- tool <name>` writes `tools/commands/<name>.ts` and registers it; it is then
available on the CLI and over MCP. Keep results short (`summary`), put details in `details`,
and write large outputs under `out/` (`files`).

## MCP

`.mcp.json` starts `node tools/mcp/startMcpServer.ts`. Agents that speak MCP get every tool
with its JSON Schema arguments and docs. CLI flags and MCP arguments are the same fields.
