import { Context, Effect, Layer } from "effect";
import type { ListenerId, LobbyId } from "@audire/domain";

export type WriteFrame = (bytes: Uint8Array) => Effect.Effect<void>;

const maxSkipped = 8;

type Slot = {
  write: WriteFrame;
  busy: boolean;
  skipped: number;
};

export class WsHub extends Context.Service<
  WsHub,
  {
    readonly add: (
      lobbyId: LobbyId,
      listenerId: ListenerId,
      write: WriteFrame,
    ) => Effect.Effect<void>;
    readonly remove: (listenerId: ListenerId) => Effect.Effect<void>;
    readonly broadcast: (lobbyId: LobbyId, bytes: Uint8Array) => Effect.Effect<void>;
    readonly send: (listenerId: ListenerId, bytes: Uint8Array) => Effect.Effect<void>;
    readonly listenerCount: (lobbyId: LobbyId) => Effect.Effect<number>;
    readonly stats: Effect.Effect<{
      readonly bytesOut: number;
      readonly framesOut: number;
      readonly listeners: number;
      readonly dropped: number;
    }>;
  }
>()("@audire/WsHub") {
  static readonly layer = Layer.effect(
    WsHub,
    Effect.sync(() => {
      const slots = new Map<ListenerId, Slot>();
      const rooms = new Map<LobbyId, Set<ListenerId>>();
      let bytesOut = 0;
      let framesOut = 0;
      let dropped = 0;

      const remove = (listenerId: ListenerId) =>
        Effect.sync(() => {
          slots.delete(listenerId);
          for (const room of rooms.values()) {
            room.delete(listenerId);
          }
        });

      return {
        add: (lobbyId, listenerId, write) =>
          Effect.sync(() => {
            slots.set(listenerId, { write, busy: false, skipped: 0 });
            const room = rooms.get(lobbyId) ?? new Set<ListenerId>();
            room.add(listenerId);
            rooms.set(lobbyId, room);
          }),
        remove,
        listenerCount: (lobbyId) => Effect.sync(() => rooms.get(lobbyId)?.size ?? 0),
        stats: Effect.sync(() => {
          let listeners = 0;
          for (const room of rooms.values()) {
            listeners += room.size;
          }
          return { bytesOut, framesOut, listeners, dropped };
        }),
        broadcast: (lobbyId, bytes) =>
          Effect.gen(function* () {
            const room = rooms.get(lobbyId);
            if (!room) {
              return;
            }
            for (const id of [...room]) {
              const slot = slots.get(id);
              if (!slot) {
                continue;
              }
              if (slot.busy) {
                slot.skipped += 1;
                if (slot.skipped > maxSkipped) {
                  dropped += 1;
                  yield* remove(id);
                }
                continue;
              }
              slot.busy = true;
              slot.skipped = 0;
              bytesOut += bytes.length;
              framesOut += 1;
              yield* Effect.forkDetach(
                slot.write(bytes).pipe(
                  Effect.ensuring(
                    Effect.sync(() => {
                      const current = slots.get(id);
                      if (current) {
                        current.busy = false;
                      }
                    }),
                  ),
                  Effect.ignore,
                ),
              );
            }
          }),
        send: (listenerId, bytes) => {
          const slot = slots.get(listenerId);
          return slot ? slot.write(bytes) : Effect.void;
        },
      };
    }),
  );
}
