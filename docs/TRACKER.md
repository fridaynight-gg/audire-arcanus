# Tracker

Update this file on every item. Ritual: one id, then commit.

**Now:** `4.5` Distribution (later)

**Goal:** phase 4 (app source + harden)

**Phase:** 4 (harden)

## Lane A — Docs / contract

| id  | item                                                 | status | proof                           |
| --- | ---------------------------------------------------- | ------ | ------------------------------- |
| 0.1 | LOCK, ADRs, PLAN, RITUAL, TRACKER, AGENT-CONTRACT.md | done   | files on rewrite/effect-opentui |
| 0.2 | Root AGENTS.md = AGENT-CONTRACT.md                   | done   |                                 |

## Lane B — Tooling / workspace

| id   | item                                     | status | proof |
| ---- | ---------------------------------------- | ------ | ----- |
| 0.3  | Bun workspace + TS 7 + Vite 8 + React 19 | done   |       |
| 0.4  | Oxlint Oxfmt anti-slop tsgo              | done   |       |
| 0.5  | Package skeletons                        | done   |       |
| 0.11 | Delete kill-list tree                    | done   |       |

## Lane C — Server

| id  | item                      | status | proof                                                    |
| --- | ------------------------- | ------ | -------------------------------------------------------- |
| 0.6 | Effect HTTP /health :5551 | done   | curl ok                                                  |
| 1.1 | protocol + domain Schema  | done   | frames + CreateLobby/JoinLobby                           |
| 1.2 | LobbyRepo                 | done   | vitest 3 passed; Layer.effect + Map                      |
| 1.3 | HTTP lobby API            | done   | POST/GET/PATCH/join/kick; 404 miss                       |
| 1.4 | WS control frames         | done   | WS join → `_tag: joined`; hang handler (no 204)          |
| 2.1 | WS audio frames           | done   | 0x01 pcm-s16le then 0x02 x3 then 0x03                    |
| 2.2 | Opus encode               | done   | libopus-wasm; packets ~430–636B vs 3840 PCM              |
| 4.1 | Broadcaster drop          | done   | slow Effect.never dropped; fast still receives           |
| 4.2 | Stats                     | done   | bytesOut 20 for two 10-byte frames; GET /api/stats       |
| 4.3 | Shutdown                  | done   | abort kills helper; POST /api/shutdown 1→0 capture procs |
| 4.4 | Loopback bind flag        | done   | `serve --loopback` listens 127.0.0.1:5551                |

## Lane D — CLI

| id  | item                     | status | proof                                              |
| --- | ------------------------ | ------ | -------------------------------------------------- |
| 0.9 | `audire --help`          | done   |                                                    |
| 1.5 | lobby create/list        | done   | `lobby create studio` + `lobby list`               |
| 2.6 | stream start fixture/mic | done   | `stream start ID --fixture sine` / `--mic 0`; stop |

## Lane E — Host TUI

| id   | item                 | status | proof                                    |
| ---- | -------------------- | ------ | ---------------------------------------- |
| 0.7  | OpenTUI hello        | done   | host starts HttpLive + renderer          |
| 1.6  | lobby pane           | done   | pane tests; n/up/down; poll /api/lobbies |
| 2.7  | sources + start/stop | done   | s/x/left/right; pane tests               |
| 1.9  | rename roster kick   | done   | pane tests: n prompt, r, k, tab panels   |
| 1.10 | theme picker         | done   | pane tests: t modal, 33 OpenCode names   |

## Lane F — Web

| id   | item                | status | proof                                |
| ---- | ------------------- | ------ | ------------------------------------ |
| 0.8  | Vite React stub     | done   |                                      |
| 1.7  | join + roster       | done   | Playwright two pages see alice/bob   |
| 1.11 | tavern join UX      | done   | portraits tests; avatar/pet on join  |
| 1.12 | hall walk chat dice | done   | 12 classes; pose/say/roll; map tests |
| 2.5  | Worklet + wasm Opus | done   | Playwright player-state live         |

## Lane G — Capture

| id   | item                           | status               | proof                                              |
| ---- | ------------------------------ | -------------------- | -------------------------------------------------- |
| 0.10 | Rust crate help + fixture sine | done                 | cargo release + --help                             |
| 2.3  | Effect supervisor              | done                 | spawn fixture sine; abort on stop                  |
| 2.4  | macOS mic                      | done                 | --list mics; --mic framed 3840; GET /api/sources   |
| 3.1  | list apps                      | done                 | NSWorkspace; Music/Spotify in --list               |
| 3.2  | capture app                    | done                 | --app PID SCK; TCC decline → PermissionDenied JSON |
| 3.3  | PermissionDenied               | done                 | GET /api/capture/status tag; TUI fault line        |
| 3.4  | Swift fallback                 | skipped until needed |                                                    |
| 3.5  | Windows                        | todo                 |                                                    |
| 3.6  | Linux                          | todo                 |                                                    |

## Lane H — E2E

| id  | item                          | status | proof                                  |
| --- | ----------------------------- | ------ | -------------------------------------- |
| 1.8 | Playwright join/roster/kick   | done   | chromium: alice+bob roster, kick alice |
| 2.8 | Headed fixture playback state | done   | e2e/playback.spec.ts                   |

## Log

- 2026-10-04: tavern hall walk/chat/d20; 12 class visages; animated pet followers.
- 2026-10-04: web tavern join (Tailwind 4); visage + companion; roster as patrons.
- 2026-10-04: t opens Themes modal (OpenCode default ids); arrows preview, enter apply, esc cancel.
- 2026-10-04: q quits the host (shutdown + TUI destroy). TUI Tokyo Night panels; n/r name, roster, k kick, y copy, c close.
- 2026-10-03: WS join control frame verified (`joined`). Hang HTTP handler after upgrade.
- 2026-10-03: Playwright join/roster/kick passed on Chromium.
- 2026-10-03: serve --loopback binds 127.0.0.1:5551.
