import { Context, Effect, Layer } from "effect";
import { CaptureUnavailable, type LobbyId, LobbyNotFound } from "@audire/domain";
import { encodeFrame, encodeMediaPayload, FrameType } from "@audire/protocol";
import { startFixtureSine, createOpusEncoder } from "@audire/audio";
import { LobbyRepo } from "./lobby-repo.ts";
import { WsHub } from "./ws-hub.ts";

const encoder = new TextEncoder();

export class Streamer extends Context.Service<
  Streamer,
  {
    readonly start: (lobbyId: LobbyId) => Effect.Effect<void, LobbyNotFound | CaptureUnavailable>;
    readonly stop: (lobbyId: LobbyId) => Effect.Effect<void>;
  }
>()("@audire/Streamer") {
  static readonly layer = Layer.effect(
    Streamer,
    Effect.gen(function* () {
      const hub = yield* WsHub;
      const repo = yield* LobbyRepo;
      const running = new Map<LobbyId, AbortController>();

      return {
        start: (lobbyId: LobbyId) =>
          Effect.gen(function* () {
            yield* repo.get(lobbyId);
            const existing = running.get(lobbyId);
            if (existing) {
              return;
            }
            const ac = new AbortController();
            running.set(lobbyId, ac);
            yield* repo.setStreaming(lobbyId, true);
            yield* Effect.forkDetach(
              Effect.tryPromise({
                try: async () => {
                  const opus = await createOpusEncoder();
                  let seq = 0;
                  let started = false;
                  try {
                    await startFixtureSine(ac.signal, async (pcm) => {
                      if (!started) {
                        started = true;
                        const body = encoder.encode(
                          JSON.stringify({
                            codec: "opus",
                            sampleRate: 48000,
                            channels: 2,
                            frameDurationMs: 20,
                            bitrate: 160000,
                          }),
                        );
                        await Effect.runPromise(
                          hub.broadcast(lobbyId, encodeFrame(FrameType.streamStart, body)),
                        );
                      }
                      const packet = opus.encode(pcm);
                      const media = encodeMediaPayload(seq, seq * 20, packet);
                      seq += 1;
                      await Effect.runPromise(
                        hub.broadcast(lobbyId, encodeFrame(FrameType.opus, media)),
                      );
                    });
                  } finally {
                    opus.free();
                  }
                },
                catch: (cause) => new CaptureUnavailable({ reason: String(cause) }),
              }).pipe(Effect.ignore),
            );
          }),
        stop: (lobbyId: LobbyId) =>
          Effect.gen(function* () {
            const ac = running.get(lobbyId);
            ac?.abort();
            running.delete(lobbyId);
            yield* repo.setStreaming(lobbyId, false).pipe(Effect.ignore);
            yield* hub.broadcast(lobbyId, encodeFrame(FrameType.streamStop, new Uint8Array()));
          }),
      };
    }),
  );
}
