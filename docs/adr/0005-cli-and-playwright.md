# ADR 0005 — Headless CLI and Playwright split

## Status

Accepted

## Decision

Effect CLI (`apps/cli`) is the programmatic host: serve, sources, lobby, stream, including `fixture:sine`.

Playwright MCP + Chromium is for agent-driven exploration. `@playwright/test` + Chromium is CI: join, roster, kick, frame seq / player state.

TUI is not the e2e surface.

## Why

OpenTUI is the operator UI. Contracts belong on HTTP/WS. MCP is not deterministic CI.

## Consequence

Phase 1 can close without a pretty TUI if CLI + web + Playwright prove lobbies.
