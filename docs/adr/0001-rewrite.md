# ADR 0001 — Rewrite, do not migrate

## Status

Accepted

## Decision

Greenfield on `rewrite/effect-opentui`. Do not port Nest modules, Electron, or the MP3 client. `main` remains the archive.

## Why

The old tree is the failure mode (Socket.IO + ffmpeg device list + 1 s MP3 + `new Audio(base64)`). Incremental migration would keep that shape.

## Consequence

Phase 0 deletes the kill list from this branch after skeletons exist.
