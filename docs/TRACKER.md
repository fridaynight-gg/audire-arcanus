# Tracker

Update this file on every item. Ritual: one id, then commit.

**Now:** `0.4`

**Goal:** phase 4 (app source + harden)

**Phase:** 0

## Lane A — Docs / contract

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.1 | LOCK, ADRs, PLAN, RITUAL, TRACKER, AGENT-CONTRACT.md | done | files on rewrite/effect-opentui |
| 0.2 | Root AGENTS.md = AGENT-CONTRACT.md; README; tsconfig.base; drop changelog/streaming/prettier | done | AGENTS.md matches contract |

## Lane B — Tooling / workspace

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.3 | Bun workspace + TS 7 + Vite 8 + React 19 | done | typescript 7.0.2, vite 8.3.2, react 19.3.0, tsc -b |
| 0.4 | Oxlint Oxfmt anti-slop tsgo | todo | |
| 0.5 | Package skeletons | todo | |
| 0.11 | Delete kill-list tree from this branch | todo | after 0.5 so git still has a compile target |

## Lane C — Server

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.6 | Effect HTTP /health :5551 | todo | |
| 1.1 | protocol + domain Schema | todo | |
| 1.2 | LobbyRepo | todo | |
| 1.3 | HTTP lobby API | todo | |
| 1.4 | WS control frames | todo | |
| 2.1 | WS audio frames | todo | |
| 2.2 | Opus encode | todo | |
| 4.1 | Broadcaster drop | todo | |
| 4.2 | Stats | todo | |
| 4.3 | Shutdown | todo | |
| 4.4 | Loopback bind flag | todo | |

## Lane D — CLI

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.9 | `audire --help` | todo | |
| 1.5 | lobby create/list | todo | |
| 2.6 | stream start fixture/mic | todo | |

## Lane E — Host TUI

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.7 | OpenTUI hello | todo | |
| 1.6 | lobby pane | todo | |
| 2.7 | sources + start/stop | todo | |

## Lane F — Web

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.8 | Vite React stub | todo | |
| 1.7 | join + roster | todo | |
| 2.5 | Worklet + wasm Opus | todo | |

## Lane G — Capture

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.10 | Rust crate help + fixture sine | todo | |
| 2.3 | Effect supervisor | todo | |
| 2.4 | macOS mic | todo | |
| 3.1 | list apps | todo | |
| 3.2 | capture app | todo | |
| 3.3 | PermissionDenied | todo | |
| 3.4 | Swift fallback (only if 3.2 fails) | skipped until needed | |
| 3.5 | Windows | todo | after macOS |
| 3.6 | Linux | todo | after macOS |

## Lane H — E2E

| id | item | status | proof |
| --- | --- | --- | --- |
| 1.8 | Playwright join/roster/kick | todo | |
| 2.8 | Headed fixture playback state | todo | |

## Log

- 2026-10-03: 0.1 written on rewrite/effect-opentui. Root AGENTS.md blocked.
- 2026-10-03: 0.2 done. Goal locked through phase 4. Defaults kept (Bun workspaces, 0.0.0.0:5551, apps/cli).
- 2026-10-03: 0.3 Bun workspace. TS 7.0.2 / Vite 8.3.2 / React 19.3.0.
