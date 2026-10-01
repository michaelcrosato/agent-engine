# 0006: Headless first: every room is a test

**Status:** accepted

## Context

Agents cannot watch a game being played. They need a fast, deterministic way to know that a
level still works after a change, and a way to explore one without a browser.

## Decision

- The simulation (fixed 60 Hz ticks: input, update, physics, late) runs identically in Node.
  Rendering, clip sampling, and audio output are confined to the browser-only `frame` phase and
  services; headless runs record audio instead of playing it.
- Tests drive the game through input actions (`hold`, `press`, `lookAt`) and a nav-grid bot
  (`walkTo`), not by calling internals.
- Every room has a test, enforced by `npm run check`. The same step vocabulary powers
  `npm run play`, `npm run shot --steps`, and MCP.

## Consequences

- The whole suite runs in seconds and catches gameplay regressions (doors, keys, waves, lifts).
- Visual problems still need screenshots (`npm run shot`); tests check state, not pixels.
- New browser-only features must keep their gameplay state in components so tests can see it.
