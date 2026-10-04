import { Effect, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import type * as NetSocket from "effect/socket/Socket";
import { decodeFrame, encodeFrame, FrameType, WsInbound } from "@audire/protocol";
import type { Listener, ListenerId, LobbyId } from "@audire/domain";
import { LobbyRepo } from "./lobby-repo.ts";
import { WsHub } from "./ws-hub.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const control = (value: unknown): Uint8Array =>
  encodeFrame(FrameType.control, encoder.encode(JSON.stringify(value)));

const bytesOf = (chunk: Uint8Array | string): Uint8Array => {
  if (chunk instanceof Uint8Array) {
    return chunk;
  }
  return encoder.encode(chunk);
};

const runSession = (socket: NetSocket.Socket) =>
  Effect.gen(function* () {
    const writer = yield* socket.writer;
    const reader = yield* socket.reader;
    const repo = yield* LobbyRepo;
    const hub = yield* WsHub;
    let listenerId: ListenerId | undefined;
    let lobbyId: LobbyId | undefined;
    let username = "";
    let avatar = "wizard";
    let pet = "none";
    let lastRoll = 0;

    yield* Effect.addFinalizer(() =>
      Effect.ignore(
        Effect.gen(function* () {
          if (listenerId) {
            yield* hub.remove(listenerId);
            yield* repo.removeListener(listenerId).pipe(Effect.ignore);
          }
          if (lobbyId) {
            const people = yield* repo
              .listenersFor(lobbyId)
              .pipe(Effect.orElseSucceed((): ReadonlyArray<Listener> => []));
            yield* hub.broadcast(lobbyId, control({ _tag: "roster", listeners: people }));
          }
        }),
      ),
    );

    const write = (bytes: Uint8Array) => writer.write(bytes).pipe(Effect.ignore);

    while (true) {
      const batch = yield* reader.pull;
      for (const chunk of batch) {
        const frame = decodeFrame(bytesOf(chunk));
        if (!frame || frame.type !== FrameType.control) {
          continue;
        }
        const parsed = yield* Schema.decodeUnknownEffect(WsInbound)(
          JSON.parse(decoder.decode(frame.payload)) as unknown,
        ).pipe(Effect.orElseSucceed(() => undefined));
        if (!parsed) {
          continue;
        }
        if (parsed._tag === "join") {
          const lobby = yield* repo.byCode(parsed.joinCode);
          const listener = yield* repo.addListener(
            lobby.id,
            parsed.username,
            parsed.avatar ?? "wizard",
            parsed.pet ?? "none",
          );
          listenerId = listener.id;
          lobbyId = lobby.id;
          username = parsed.username;
          avatar = parsed.avatar ?? "wizard";
          pet = parsed.pet ?? "none";
          yield* hub.add(lobby.id, listener.id, write);
          yield* write(control({ _tag: "joined", lobby, listener }));
          const people = yield* repo.listenersFor(lobby.id);
          yield* hub.broadcast(lobby.id, control({ _tag: "roster", listeners: people }));
        }

        if (parsed._tag === "leave") {
          return;
        }

        if (listenerId === undefined || lobbyId === undefined) {
          continue;
        }

        if (parsed._tag === "pose") {
          yield* hub.broadcast(
            lobbyId,
            control({
              _tag: "posed",
              listenerId,
              username,
              avatar,
              pet,
              x: parsed.x,
              y: parsed.y,
              dir: parsed.dir,
              anim: parsed.anim,
            }),
          );
        }

        if (parsed._tag === "say") {
          const text = parsed.text.trim().slice(0, 80);

          if (text.length === 0) {
            continue;
          }

          yield* hub.broadcast(lobbyId, control({ _tag: "said", listenerId, username, text }));
        }

        if (parsed._tag === "roll") {
          const now = Date.now();

          if (now - lastRoll < 1000) {
            continue;
          }

          lastRoll = now;
          const value = 1 + Math.floor(Math.random() * 20);
          yield* hub.broadcast(lobbyId, control({ _tag: "rolled", listenerId, username, value }));
        }
      }
    }
  }).pipe(Effect.ignore);

export const WsRoute = HttpRouter.add(
  "GET",
  "/ws",
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const socket = yield* request.upgrade;
    yield* runSession(socket).pipe(Effect.scoped);
    return HttpServerResponse.empty();
  }),
);
