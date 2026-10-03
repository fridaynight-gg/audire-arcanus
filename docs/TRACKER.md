# Tracker

Update this file on every item. Ritual: one id, then commit.

**Now:** `1.2` (LobbyRepo Effect 4 — Context.Service layer; zipRight is v3)

**Goal:** phase 4 (app source + harden)

**Phase:** 0 almost closed; 1 not proven

## Lane A — Docs / contract

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.1 | LOCK, ADRs, PLAN, RITUAL, TRACKER, AGENT-CONTRACT.md | done | files on rewrite/effect-opentui |
| 0.2 | Root AGENTS.md = AGENT-CONTRACT.md; README; tsconfig.base; drop changelog/streaming/prettier | done | AGENTS.md matches contract |

## Lane B — Tooling / workspace

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.3 | Bun workspace + TS 7 + Vite 8 + React 19 | done | typescript 7.0.2, vite 8.3.2, react 19.3.0 |
| 0.4 | Oxlint Oxfmt anti-slop tsgo | done | oxlint 1.86 + vendored anti-slop + effect-tsgo patch |
| 0.5 | Package skeletons | done | apps/* packages/* crates/* |
| 0.11 | Delete kill-list tree from this branch | done | Nest/Electron/client/test removed |

## Lane C — Server

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.6 | Effect HTTP /health :5551 | done | curl 127.0.0.1:5551/health → {"ok":true} |
| 1.1 | protocol + domain Schema | wip | domain ids/models/errors/source; protocol empty |
| 1.2 | LobbyRepo | blocked | Effect 4 vs v3 Service/andThen; file pulled |
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
| 0.9 | `audire --help` | done | bun apps/cli/src/main.ts --help |
| 1.5 | lobby create/list | todo | |
| 2.6 | stream start fixture/mic | todo | |

## Lane E — Host TUI

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.7 | OpenTUI hello | todo | host still console stub |
| 1.6 | lobby pane | todo | |
| 2.7 | sources + start/stop | todo | |

## Lane F — Web

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.8 | Vite React stub | done | apps/web App.tsx join form (not wired) |
| 1.7 | join + roster | todo | |
| 2.5 | Worklet + wasm Opus | todo | |

## Lane G — Capture

| id | item | status | proof |
| --- | --- | --- | --- |
| 0.10 | Rust crate help + fixture sine | done | cargo build --release; --help; sine loop not e2e-proved |
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

- 2026-10-03: 0.1–0.4 tooling.
- 2026-10-03: 0.6 /health live. 0.9 CLI help. 0.10 rust helper builds. Nest tree deleted. Phase 1+ not verified. Effect 4 APIs diverge from effect-solutions (no zipRight; brand/check quirks; Service layer typing).
