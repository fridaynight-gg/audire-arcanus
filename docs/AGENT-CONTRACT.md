# Agent contract

TUI host captures mic or per-app audio and streams it to browser lobbies with join codes. LAN. Port 5551.

Stack: Bun; Effect 4 + @effect/platform-bun; @opentui/core; Vite + React; Rust capture child (Swift fallback). Forbidden: Nest, Electron, Socket.IO, ffmpeg capture, MP3/base64.

Before any work: docs/LOCK.md, docs/RITUAL.md, docs/TRACKER.md. One tracker item. Update the tracker. Commit.

After scaffold: `bun run check` | `bun run dev` | `bun run test` | `bun run test:e2e`

TS 7 strict. Oxlint + Oxfmt + vendored anti-slop (generic + Effect). Schema at HTTP/WS boundaries. Tagged errors. Match / catchTag. No unknown in public APIs.

Capture: Effect supervises the Rust helper; PCM on the pipe; Opus in TS. Tests use `fixture:sine`.

Do not port `src/`, `electron/`, or `client/` from main. Greenfield only.

Note: root `/AGENTS.md` still describes the Nest app until write approval lets us replace it with this file.
