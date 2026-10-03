# ADR 0006 — Tooling: Oxc + vendored anti-slop

## Status

Accepted

## Decision

Oxlint + Oxfmt. Vendor dmmulroy/anti-slop into `tools/oxlint/anti-slop/` (not an npm dep). Enable generic + Effect rule groups. `@effect/tsgo` for editor diagnostics. Vitest for unit tests.

No Prettier, ESLint, or Jest.

## Why

Lock + Effect style need mechanical enforcement or the rewrite will slop again.

## Consequence

`no-object-parameters` means HTTP bodies are Schema classes/structs, not ad-hoc option objects. Do not disable the rule to land code.
