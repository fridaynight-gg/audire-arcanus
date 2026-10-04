# Implementation plan

Greenfield on `rewrite/effect-opentui`. `main` stays the Nest/Electron archive. Goal is phase 4 (app sources + harden), not scaffold-only.

Phase N is closed only when its proof holds. Tracker ids in parentheses.

## Phase 0 — Scaffold

Workspace, tooling, empty packages, Bun Effect HTTP “ok” on 5551, OpenTUI hello, Vite stub, CLI stub, capture crate stub.

Proof: `bun run check` green on empty packages; `bun run dev` shows TUI text and serves `/health`.

- `0.1` Planning docs (this folder)
- `0.2` Root AGENTS.md = AGENT-CONTRACT.md
- `0.3` Bun workspace + TS 7 + Vite 8 + React 19 + engines (extends `tsconfig.base.json`)
- `0.4` Oxlint, Oxfmt, vendor anti-slop + Effect rules, `@effect/tsgo`
- `0.5` Package skeletons matching LOCK repo shape
- `0.6` Effect HTTP `/health` on 5551 (platform-bun)
- `0.7` OpenTUI hello in apps/host
- `0.8` Vite React stub in apps/web
- `0.9` CLI `audire --help`
- `0.10` Rust crate `audire-capture --help` / `--fixture sine` emitting PCM
- `0.11` Delete Nest/Electron/old client from this branch (kill list)

## Phase 1 — Lobbies without audio

Schema, join/leave/kick, TUI lobby list, React join page. Fake streaming flag.

Proof: two browsers join; roster updates; kick works; CLI can create/list lobbies.

- `1.1` protocol + domain Schema
- `1.2` LobbyRepo (Ref + HashMap)
- `1.3` HTTP lobby API
- `1.4` WS control frames (join/leave/roster/kick)
- `1.5` CLI lobby commands
- `1.6` TUI lobby pane
- `1.7` Web join + roster
- `1.8` Playwright contract: join / roster / kick
- `1.9` TUI rename, roster, kick, Tokyo Night panels
- `1.10` TUI theme picker (`t`) matching OpenCode default themes
- `1.11` Web tavern join (avatar, pet, roster hall)
- `1.12` Tavern walk, chat bubbles, shared d20
- `1.13` Pixel tavern room art (bar, tables, lanterns)

## Phase 2 — Mic + Opus + Worklet (macOS first)

One mic, one lobby, gap-free 10+ minutes, ~150–400 ms delay.

Proof: seq monotonic; underruns ~0; Chromium plays fixture and mic.

- `2.1` framed WS audio (`0x01` start, `0x02` opus, `0x03` stop)
- `2.2` Opus encode in TS from PCM stream
- `2.3` Supervisor: spawn helper, parse PCM, tagged errors
- `2.4` Mic list/start on macOS via helper
- `2.5` Web AudioWorklet + wasm Opus + jitter buffer
- `2.6` CLI `stream start --source fixture:sine | mic:<id>`
- `2.7` TUI source list + start/stop
- `2.8` Headed Playwright: fixture stream reaches player state

## Phase 3 — App sources

macOS ScreenCaptureKit via Rust. Swift fallback only if TCC/audio-only fails.

Proof: list running apps; capture Music/Spotify; host process excluded; permission errors in TUI.

- `3.1` List apps
- `3.2` Capture by pid/bundle id
- `3.3` PermissionDenied path
- `3.4` Swift Darwin backend behind the same stdin/stdout contract (only if 3.2 fails)
- `3.5` Windows WASAPI process loopback (after macOS works)
- `3.6` Linux PipeWire monitor + mics (per-PID stretch)

## Phase 4 — Harden

Slow-client drop, real stats, clean shutdown (Scope), optional SEA/binary later.

Proof: kill a slow listener without stalling capture; stats match bytes out.

- `4.1` Broadcaster backpressure / drop
- `4.2` Stats service
- `4.3` Shutdown / helper lifecycle
- `4.4` Bind loopback flag
- `4.5` Distribution (later)
