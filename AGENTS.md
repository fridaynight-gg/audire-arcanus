# Agent contract

TUI host captures mic or per-app audio and streams it to browser lobbies with join codes. LAN. Port 5551.

Stack: Bun; Effect 4 + @effect/platform-bun; @opentui/core; Vite + React; Rust capture child (Swift fallback).

Before any work: docs/LOCK.md, docs/RITUAL.md, docs/TRACKER.md. One tracker item. Update the tracker. Commit.

After scaffold: `bun run check` | `bun run dev` | `bun run test` | `bun run test:e2e`

TS 7 strict. Oxlint + Oxfmt + vendored anti-slop (generic + Effect). Schema at HTTP/WS boundaries. Tagged errors. Match / catchTag. No unknown in public APIs. Use `effect-solutions` cli for understanding effect ts best practices. Use before making effect decisions.

Lint, format, test, typecheck and commit and push often.

Capture: Effect supervises the Rust helper; PCM on the pipe; Opus in TS. Tests use `fixture:sine`.
