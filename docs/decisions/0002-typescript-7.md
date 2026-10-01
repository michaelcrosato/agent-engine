# 0002: TypeScript 7, erasable syntax, no build step

**Status:** accepted

## Context

Agents iterate fastest when there is nothing between editing a file and running it. Node 22.18+
strips TypeScript types natively; Vite does the same for the browser.

## Decision

- TypeScript 7 (`tsc` is only a type checker: `noEmit`). `erasableSyntaxOnly` is on, so code
  avoids features that need compilation: no `enum`, no `namespace`, no constructor parameter
  properties, no decorators.
- Imports carry their `.ts` extension (`allowImportingTsExtensions`, `nodenext` modules).
- Package-internal aliases via `package.json#imports`: `#engine/*`, `#games/*`, `#tools/*`.

## Consequences

- `node tools/cli.ts` runs tools directly; tests run in Vitest; the browser runs through Vite.
  No `dist/` for development.
- Type errors never block running code; `npm run check` catches them.
- Enumerations are string unions or `as const` arrays (which also feed zod enums).
