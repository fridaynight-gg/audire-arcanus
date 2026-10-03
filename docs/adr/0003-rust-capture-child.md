# ADR 0003 — Rust capture child, Swift fallback

## Status

Accepted

## Decision

`crates/audire-capture` is a supervised child. JSON commands on stdin, framed PCM s16le 48 kHz stereo on stdout, JSON events on stderr. No HTTP, Opus, or lobby logic in the helper.

macOS is priority (ScreenCaptureKit + Core Audio). Windows WASAPI and Linux PipeWire share this crate later.

If ScreenCaptureKit-rs cannot get TCC/audio-only right, replace the Darwin backend with Swift. Keep the wire format.

Do not load capture into the Bun process (napi). A capture crash must not kill the TUI. Do not use ffmpeg as the capture engine.

## Why

Per-app audio is an OS API. TS cannot do it. A process boundary is the supervision story Effect is good at.

## Consequence

Tests use `--fixture sine` so CI never needs a mic or ScreenCaptureKit.
