# ADR 0002 — Bun host, Effect 4, OpenTUI core

## Status

Accepted

## Decision

One Bun process runs `@effect/platform-bun` HTTP/WS and `@opentui/core`. Package manager is Bun workspaces. TypeScript 7 strict.

Not `@opentui/react` (second React reconciler next to Vite). Not Node 26 as the host unless Bun is abandoned. Not Effect runtime in the browser; share Schema only.

## Why

OpenTUI’s native core is first-class on Bun. Effect’s Node/Bun split is a layer. The listener UI is a real browser, so Vite + React stays there.

## Consequence

CI Playwright may use Node; it talks to `audire serve` over HTTP, it is not the host runtime.
