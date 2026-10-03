# Work ritual

Follow this every session, including after context compression.

## Start

1. Read `/AGENTS.md`, `docs/LOCK.md`, this file, `docs/TRACKER.md`.
2. If TRACKER “now” is empty, take the first unblocked item in PLAN.md order. Do not invent parallel work.
3. Open the ADR listed on that item. Do not reopen locked choices. Before Effect API choices, run `bunx effect-solutions`.

## Do

4. One tracker id. No drive-by refactors, no extra packages, no second lane.
5. Prove it: typecheck/lint for docs-only skip; otherwise `bun run check` and the item’s proof in PLAN.md.
6. Update TRACKER: status, proof, date. Move “now”. Blocked items get a reason, not a skip.
7. Commit on `rewrite/effect-opentui` with `lane/<id>: <imperative summary>`. Push the branch.
8. Stop at a lock contradiction or a missing native permission. Write the blocker on the item. Do not “temporarily” ffmpeg.

## Do not

- Port files from `src/`, `electron/`, `client/`
- Disable anti-slop rules to land a commit
- Put Opus, HTTP, or lobby logic in the Rust helper
- Put Effect runtime in the Vite app
- Use Socket.IO, Nest, Electron, or MP3 chunks
- Start the next phase before the current phase’s proof box is checked

## Session handoff

End of session: TRACKER “now” is the next id, working tree clean or the in-progress id marked `wip`. Uncommitted work is a failed ritual.
