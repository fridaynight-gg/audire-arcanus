# Audire Arcanus

Stream microphone or application audio from a terminal on your machine to browsers on the LAN.

You run the host, pick a source, create a lobby, share the 6-character join code. Listeners open `http://<host>:5551` and hear it.

## Stack

Bun, Effect 4, OpenTUI, Vite 8 + React 19, a small Rust capture process. Details: `docs/LOCK.md`.

## Status

Rewrite on `rewrite/effect-opentui`. The old Nest/Electron tree is being replaced. See `docs/PLAN.md` and `docs/TRACKER.md`.

## After scaffold

```
bun i
bun run dev
```

Host TUI in the terminal. Listeners on port 5551.
