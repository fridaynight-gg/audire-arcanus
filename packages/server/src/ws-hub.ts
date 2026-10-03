import { Context, Effect, Layer } from "effect";
import type { ListenerId, LobbyId } from "@audire/domain";

export type WriteFrame = (bytes: Uint8Array) => Effect.Effect<void>;

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
  }
>()("@audire/WsHub") {
  static readonly layer = Layer.effect(
    WsHub,
    Effect.sync(() => {
      const writes = new Map<ListenerId, WriteFrame>();
      const rooms = new Map<LobbyId, Set<ListenerId>>();

      return {
        add: (lobbyId, listenerId, write) =>
          Effect.sync(() => {
            writes.set(listenerId, write);
            const room = rooms.get(lobbyId) ?? new Set<ListenerId>();
            room.add(listenerId);
            rooms.set(lobbyId, room);
          }),
        remove: (listenerId) =>
          Effect.sync(() => {
            writes.delete(listenerId);
            for (const room of rooms.values()) {
              room.delete(listenerId);
            }
          }),
        broadcast: (lobbyId, bytes) =>
          Effect.gen(function* () {
            const room = rooms.get(lobbyId);
            if (!room) {
              return;
            }
            for (const id of room) {
              const write = writes.get(id);
              if (write) {
                yield* write(bytes);
              }
            }
          }),
        send: (listenerId, bytes) => {
          const write = writes.get(listenerId);
          return write ? write(bytes) : Effect.void;
        },
      };
    }),
  );
}
