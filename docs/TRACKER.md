# Tracker

Update this file on every item. Ritual: one id, then commit.

**Now:** `2.5` Worklet + wasm Opus decode

**Goal:** phase 4 (app source + harden)

**Phase:** 2 (lobbies proven; audio next)

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

| id  | item                      | status | proof                               |
| --- | ------------------------- | ------ | ----------------------------------- |
| 0.6 | Effect HTTP /health :5551 | done   | curl ok                             |
| 1.1 | protocol + domain Schema  | done   | frames + CreateLobby/JoinLobby      |
| 1.2 | LobbyRepo                 | done   | vitest 3 passed; Layer.effect + Map |
| 1.3 | HTTP lobby API            | done   | POST/GET/PATCH/join/kick; 404 miss  |
| 1.4 | WS control frames | done | WS join → `_tag: joined`; hang handler (no 204) |
| 2.1 | WS audio frames | done | 0x01 pcm-s16le then 0x02 x3 then 0x03 |
| 2.2 | Opus encode | done | libopus-wasm; packets ~430–636B vs 3840 PCM |
| 4.1 | Broadcaster drop          | todo   |                                     |
| 4.2 | Stats                     | todo   |                                     |
| 4.3 | Shutdown                  | todo   |                                     |
| 4.4 | Loopback bind flag        | todo   |                                     |

## Lane D — CLI

| id  | item                     | status | proof                                |
| --- | ------------------------ | ------ | ------------------------------------ |
| 0.9 | `audire --help`          | done   |                                      |
| 1.5 | lobby create/list        | done   | `lobby create studio` + `lobby list` |
| 2.6 | stream start fixture/mic | todo   |                                      |

## Lane E — Host TUI

| id  | item                 | status | proof                                                   |
| --- | -------------------- | ------ | ------------------------------------------------------- |
| 0.7 | OpenTUI hello | done | host starts HttpLive + renderer |
| 1.6 | lobby pane | done | pane tests; n/up/down; poll /api/lobbies |
| 2.7 | sources + start/stop | todo   |                                                         |

## Lane F — Web

| id  | item                | status | proof                                                       |
| --- | ------------------- | ------ | ----------------------------------------------------------- |
| 0.8 | Vite React stub     | done   |                                                             |
| 1.7 | join + roster | done | Playwright two pages see alice/bob |
| 2.5 | Worklet + wasm Opus | todo   |                                                             |

## Lane G — Capture

| id   | item                           | status               | proof                  |
| ---- | ------------------------------ | -------------------- | ---------------------- |
| 0.10 | Rust crate help + fixture sine | done                 | cargo release + --help |
| 2.3  | Effect supervisor              | done                 | spawn fixture sine; abort on stop |
| 2.4  | macOS mic                      | todo                 |                        |
| 3.1  | list apps                      | todo                 |                        |
| 3.2  | capture app                    | todo                 |                        |
| 3.3  | PermissionDenied               | todo                 |                        |
| 3.4  | Swift fallback                 | skipped until needed |                        |
| 3.5  | Windows                        | todo                 |                        |
| 3.6  | Linux                          | todo                 |                        |

## Lane H — E2E

| id  | item                          | status | proof |
| --- | ----------------------------- | ------ | ----- |
| 1.8 | Playwright join/roster/kick | done | chromium: alice+bob roster, kick alice |
| 2.8 | Headed fixture playback state | todo   |       |

## Log

- 2026-10-03: WS join control frame verified (`joined`). Hang HTTP handler after upgrade.
- 2026-10-03: Playwright join/roster/kick passed on Chromium.
- 2026-10-03: Opus encode via libopus-wasm. Packets ~430–636B. Next Worklet.
