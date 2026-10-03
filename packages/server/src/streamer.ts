import { Context, Effect, Layer } from "effect";
import { CaptureUnavailable, type LobbyId, LobbyNotFound, PermissionDenied } from "@audire/domain";
import { encodeFrame, encodeMediaPayload, FrameType, type StreamSource } from "@audire/protocol";
import { startCapture, createOpusEncoder } from "@audire/audio";
import { LobbyRepo } from "./lobby-repo.ts";
import { WsHub } from "./ws-hub.ts";

const encoder = new TextEncoder();

export type CaptureFault = {
  readonly tag: string;
  readonly message: string;
};

const captureArgs = (source: StreamSource | undefined): Array<string> => {
  if (source?._tag === "mic") {
    return ["--mic", source.id];
  }
  if (source?._tag === "app") {
    return ["--app", String(source.pid)];
  }
  return ["--fixture", "sine"];
};

const faultFrom = (cause: unknown): CaptureFault => {
  if (cause instanceof PermissionDenied) {
    return { tag: "PermissionDenied", message: cause.source };
  }
  if (cause instanceof CaptureUnavailable) {
    return { tag: "CaptureUnavailable", message: cause.reason };
  }
  return { tag: "CaptureUnavailable", message: String(cause) };
};

export class Streamer extends Context.Service<
  Streamer,
  {
    readonly start: (
      lobbyId: LobbyId,
      source: StreamSource | undefined,
    ) => Effect.Effect<void, LobbyNotFound | CaptureUnavailable>;
    readonly stop: (lobbyId: LobbyId) => Effect.Effect<void>;
    readonly lastFault: Effect.Effect<CaptureFault | undefined>;
  }
>()("@audire/Streamer") {
  static readonly layer = Layer.effect(
    Streamer,
    Effect.gen(function* () {
      const hub = yield* WsHub;
      const repo = yield* LobbyRepo;
      const running = new Map<LobbyId, AbortController>();
      let lastFault: CaptureFault | undefined;

      return {
        lastFault: Effect.sync(() => lastFault),
        start: (lobbyId: LobbyId, source: StreamSource | undefined) =>
          Effect.gen(function* () {
            yield* repo.get(lobbyId);
            const existing = running.get(lobbyId);
            if (existing) {
              return;
            }
            const ac = new AbortController();
            running.set(lobbyId, ac);
            lastFault = undefined;
            yield* repo.setStreaming(lobbyId, true);
            yield* Effect.forkDetach(
              Effect.tryPromise({
                try: async () => {
                  const opus = await createOpusEncoder();
                  let seq = 0;
                  let started = false;
                  try {
                    await startCapture(captureArgs(source), ac.signal, async (pcm) => {
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
                catch: (cause) => {
                  const fault = faultFrom(cause);
                  lastFault = fault;
                  running.delete(lobbyId);
                  return fault.tag === "PermissionDenied"
                    ? new PermissionDenied({ source: fault.message })
                    : new CaptureUnavailable({ reason: fault.message });
                },
              }).pipe(
                Effect.tapError(() => repo.setStreaming(lobbyId, false).pipe(Effect.ignore)),
                Effect.ignore,
              ),
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
