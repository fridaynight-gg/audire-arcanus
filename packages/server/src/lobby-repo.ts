import { Context, Effect, Layer } from "effect";
import {
  type JoinCode,
  Listener,
  type ListenerId,
  ListenerNotFound,
  Lobby,
  type LobbyId,
  LobbyNotFound,
  makeJoinCode,
  type Username,
} from "@audire/domain";

export class LobbyRepo extends Context.Service<
  LobbyRepo,
  {
    readonly create: (name: string) => Effect.Effect<Lobby>;
    readonly list: Effect.Effect<ReadonlyArray<Lobby>>;
    readonly get: (id: LobbyId) => Effect.Effect<Lobby, LobbyNotFound>;
    readonly byCode: (code: JoinCode) => Effect.Effect<Lobby, LobbyNotFound>;
    readonly rename: (id: LobbyId, name: string) => Effect.Effect<Lobby, LobbyNotFound>;
    readonly close: (id: LobbyId) => Effect.Effect<void, LobbyNotFound>;
    readonly addListener: (
      lobbyId: LobbyId,
      username: Username,
      avatar: string,
      pet: string,
    ) => Effect.Effect<Listener, LobbyNotFound>;
    readonly removeListener: (listenerId: ListenerId) => Effect.Effect<Listener, ListenerNotFound>;
    readonly listenersFor: (
      lobbyId: LobbyId,
    ) => Effect.Effect<ReadonlyArray<Listener>, LobbyNotFound>;
    readonly setStreaming: (
      id: LobbyId,
      isStreaming: boolean,
    ) => Effect.Effect<Lobby, LobbyNotFound>;
  }
>()("@audire/LobbyRepo") {
  static readonly layer = Layer.effect(
    LobbyRepo,
    Effect.sync(() => {
      const lobbies = new Map<LobbyId, Lobby>();
      const people = new Map<ListenerId, Listener>();

      const get = (id: LobbyId): Effect.Effect<Lobby, LobbyNotFound> => {
        const lobby = lobbies.get(id);
        return lobby === undefined
          ? Effect.fail(new LobbyNotFound({ lobbyId: id }))
          : Effect.succeed(lobby);
      };

      return {
        create: (name: string) =>
          Effect.sync(() => {
            const id = crypto.randomUUID();
            const bytes = new Uint8Array(6);
            crypto.getRandomValues(bytes);
            const lobby = new Lobby({
              id,
              name,
              joinCode: makeJoinCode(bytes),
              createdAt: new Date(),
              listenerCount: 0,
              isStreaming: false,
            });
            lobbies.set(id, lobby);
            return lobby;
          }),
        list: Effect.sync(() => [...lobbies.values()]),
        get,
        byCode: (code: JoinCode) => {
          for (const lobby of lobbies.values()) {
            if (lobby.joinCode === code) {
              return Effect.succeed(lobby);
            }
          }
          return Effect.fail(new LobbyNotFound({ joinCode: code }));
        },
        rename: (id: LobbyId, name: string) =>
          get(id).pipe(
            Effect.map((lobby) => {
              const next = new Lobby({ ...lobby, name });
              lobbies.set(id, next);
              return next;
            }),
          ),
        close: (id: LobbyId) =>
          get(id).pipe(
            Effect.map(() => {
              lobbies.delete(id);
            }),
          ),
        addListener: (lobbyId: LobbyId, username: Username, avatar: string, pet: string) =>
          get(lobbyId).pipe(
            Effect.map((lobby) => {
              const listener = new Listener({
                id: crypto.randomUUID(),
                lobbyId,
                username,
                avatar,
                pet,
                connectedAt: new Date(),
              });
              people.set(listener.id, listener);
              lobbies.set(lobbyId, new Lobby({ ...lobby, listenerCount: lobby.listenerCount + 1 }));
              return listener;
            }),
          ),
        removeListener: (listenerId: ListenerId) => {
          const listener = people.get(listenerId);
          if (listener === undefined) {
            return Effect.fail(new ListenerNotFound({ listenerId }));
          }
          people.delete(listenerId);
          const lobby = lobbies.get(listener.lobbyId);
          if (lobby !== undefined) {
            lobbies.set(
              listener.lobbyId,
              new Lobby({
                ...lobby,
                listenerCount: Math.max(0, lobby.listenerCount - 1),
              }),
            );
          }
          return Effect.succeed(listener);
        },
        listenersFor: (lobbyId: LobbyId) =>
          get(lobbyId).pipe(
            Effect.map(() => [...people.values()].filter((item) => item.lobbyId === lobbyId)),
          ),
        setStreaming: (id: LobbyId, isStreaming: boolean) =>
          get(id).pipe(
            Effect.map((lobby) => {
              const next = new Lobby({ ...lobby, isStreaming });
              lobbies.set(id, next);
              return next;
            }),
          ),
      };
    }),
  );
}
