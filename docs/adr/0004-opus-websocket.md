# ADR 0004 — Opus on raw WebSocket, not Socket.IO / MP3

## Status

Accepted

## Decision

Capture PCM → Opus in TS → binary WebSocket frames:

- `u32le length | u8 type | payload`
- `0x01` stream-start (codec, rate, channels, frame duration)
- `0x02` opus-frame (seq, pts, bytes)
- `0x03` stream-stop
- `0x10` control JSON (Schema)

Browser: wasm Opus → AudioWorklet + 100–200 ms jitter buffer.

No Socket.IO. No 1-second MP3. No `new Audio(data:audio/mp3;base64)`.

## Why

That MP3 path was the quality failure. Opus is the right LAN bitrate. Raw WS is the right transport for binary frames.

## Consequence

Headless e2e asserts seq/player state, not psychoacoustics. Safari is wasm, not WebCodecs-only.
