# Lock

Frozen unless a new ADR supersedes them. Do not re-litigate in a session.

## Product

- Name: Audire Arcanus
- v1: one host process, terminal UI, browser listeners, LAN
- Join: 6-character Crockford base32 codes (no 0/O/1/I)
- Bind: `0.0.0.0:5551` (LAN). Loopback-only is a flag, not the default
- Sources: microphone, per-application output. Not “ffmpeg device list”
- Multi-lobby, kick, roster, stats
- Not v1: accounts, HTTPS, public internet, EQ, bitrate picker, mobile app, mesh
- Goal: through app-source capture and harden (PLAN phases 0–4). Do not stop at scaffold.

## Stack

| Piece | Choice |
| --- | --- |
| Host runtime | Bun 1.3+ (Windows arm64: 1.4+) |
| Package manager | Bun workspaces |
| Server | Effect 4 + `@effect/platform-bun` |
| Host UI | `@opentui/core` only (not `@opentui/react`) |
| Web | Vite 8 + React 19 |
| Effect in browser | No. Share `effect/Schema` only |
| Capture | Rust child process; Swift Darwin fallback if ScreenCaptureKit-rs fails TCC/audio |
| Capture wire | JSON commands on stdin; framed PCM s16le 48 kHz stereo on stdout; JSON events on stderr |
| Encode | Opus in the TS process (48 kHz stereo, ~160–192 kbps CBR) |
| Transport | Raw WebSocket frames. No Socket.IO |
| Headless | Effect CLI + `fixture:sine` |
| Agent e2e | Playwright MCP, Chromium |
| CI e2e | `@playwright/test`, Chromium, contract assertions (not “sounds good”) |
| Lint / format | Oxlint + Oxfmt |
| Anti-slop | Vendored `tools/oxlint/anti-slop/` + Effect rule group |
| Types | TypeScript 7, `strict` (`tsconfig.base.json`) |
| Effect practice | `effect-solutions` CLI before Effect decisions |
| Tests (unit) | Vitest |
| Process model | One Bun process (TUI + HTTP). Capture is a supervised child |

## Repo

```
apps/host              OpenTUI + process entry
apps/web               Vite React listener
apps/cli               Effect CLI (headless host)
packages/server        HTTP, WS, lobby, broadcast
packages/audio         capture port + Bun supervisor
packages/protocol      Schema, join-code, wire frames
packages/domain        branded ids, lobby/listener
crates/audire-capture  Rust helper
tools/oxlint/anti-slop vendored rules
```

## Kill list (do not port)

NestJS, Electron, Socket.IO, `@ffmpeg-installer` as capture, `client/app.ts` MP3/`new Audio(base64)`, electron-builder, STREAMING_IMPLEMENTATION.md, CHANGELOG.md, Prettier, ESLint, Jest.

## Success

`bun i && bun run dev` → TUI up → mic listed → lobby created → another machine on the LAN hears it without gaps. Capture errors are tagged in the TUI. No Nest, Electron, Socket.IO, or base64 MP3.

## Platform floor

- macOS 14.2+ for per-app capture (priority)
- Windows 10 2004+ process loopback when we get there
- Linux: PipeWire monitor + mics first; per-PID best-effort
