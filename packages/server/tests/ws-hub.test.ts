import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { WsHub } from "../src/ws-hub.ts";

describe("WsHub backpressure", () => {
  it.effect("drops a slow listener and keeps a fast one", () =>
    Effect.gen(function* () {
      const hub = yield* WsHub;
      const received: Array<number> = [];
      yield* hub.add("lobby", "slow", () => Effect.never);
      yield* hub.add("lobby", "fast", () =>
        Effect.sync(() => {
          received.push(1);
        }),
      );
      const frame = new Uint8Array([1]);
      for (let i = 0; i < 12; i++) {
        yield* hub.broadcast("lobby", frame);
        yield* Effect.yieldNow;
      }
      expect(yield* hub.listenerCount("lobby")).toBe(1);
      expect(received.length).toBeGreaterThan(0);
    }).pipe(Effect.provide(WsHub.layer)),
  );

  it.effect("bytesOut matches frames sent", () =>
    Effect.gen(function* () {
      const hub = yield* WsHub;
      yield* hub.add("lobby", "fast", () => Effect.void);
      const frame = new Uint8Array(10);
      yield* hub.broadcast("lobby", frame);
      yield* Effect.yieldNow;
      yield* hub.broadcast("lobby", frame);
      const stats = yield* hub.stats;
      expect(stats.bytesOut).toBe(20);
      expect(stats.framesOut).toBe(2);
      expect(stats.listeners).toBe(1);
    }).pipe(Effect.provide(WsHub.layer)),
  );
});
