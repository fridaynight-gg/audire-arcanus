import { Effect, Layer } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import { BunHttpServer } from "@effect/platform-bun";
import { listSources } from "@audire/audio";
import { CaptureUnavailable } from "@audire/domain";
import {
  CreateLobby,
  IdParam,
  JoinLobby,
  KickListener,
  RenameLobby,
  StreamLobby,
} from "@audire/protocol";
import { LobbyRepo } from "./lobby-repo.ts";
import { WsHub } from "./ws-hub.ts";
import { WsRoute } from "./ws.ts";
import { Streamer } from "./streamer.ts";

const jsonOk = (body: unknown) => HttpServerResponse.jsonUnsafe(body);

const jsonErr = (tag: string, status: number) =>
  HttpServerResponse.jsonUnsafe({ error: tag }, { status });

const Health = HttpRouter.add("GET", "/health", jsonOk({ ok: true }));

const ListLobbies = HttpRouter.add(
  "GET",
  "/api/lobbies",
  Effect.gen(function* () {
    const repo = yield* LobbyRepo;
    const lobbies = yield* repo.list;
    return jsonOk(lobbies);
  }),
);

const Create = HttpRouter.add(
  "POST",
  "/api/lobbies",
  Effect.gen(function* () {
    const repo = yield* LobbyRepo;
    const body = yield* HttpServerRequest.schemaBodyJson(CreateLobby);
    const lobby = yield* repo.create(body.name);
    return jsonOk(lobby);
  }),
);

const GetLobby = HttpRouter.add(
  "GET",
  "/api/lobbies/:id",
  Effect.gen(function* () {
    const repo = yield* LobbyRepo;
    const params = yield* HttpRouter.schemaPathParams(IdParam);
    const lobby = yield* repo.get(params.id);
    return jsonOk(lobby);
  }).pipe(Effect.catchTag("LobbyNotFound", () => Effect.succeed(jsonErr("LobbyNotFound", 404)))),
);

const PatchLobby = HttpRouter.add(
  "PATCH",
  "/api/lobbies/:id",
  Effect.gen(function* () {
    const repo = yield* LobbyRepo;
    const params = yield* HttpRouter.schemaPathParams(IdParam);
    const body = yield* HttpServerRequest.schemaBodyJson(RenameLobby);
    const lobby = yield* repo.rename(params.id, body.name);
    return jsonOk(lobby);
  }).pipe(Effect.catchTag("LobbyNotFound", () => Effect.succeed(jsonErr("LobbyNotFound", 404)))),
);

const DeleteLobby = HttpRouter.add(
  "DELETE",
  "/api/lobbies/:id",
  Effect.gen(function* () {
    const repo = yield* LobbyRepo;
    const params = yield* HttpRouter.schemaPathParams(IdParam);
    yield* repo.close(params.id);
    return jsonOk({ ok: true });
  }).pipe(Effect.catchTag("LobbyNotFound", () => Effect.succeed(jsonErr("LobbyNotFound", 404)))),
);

const ListListeners = HttpRouter.add(
  "GET",
  "/api/lobbies/:id/listeners",
  Effect.gen(function* () {
    const repo = yield* LobbyRepo;
    const params = yield* HttpRouter.schemaPathParams(IdParam);
    const listeners = yield* repo.listenersFor(params.id);
    return jsonOk(listeners);
  }).pipe(Effect.catchTag("LobbyNotFound", () => Effect.succeed(jsonErr("LobbyNotFound", 404)))),
);

const Join = HttpRouter.add(
  "POST",
  "/api/join",
  Effect.gen(function* () {
    const repo = yield* LobbyRepo;
    const body = yield* HttpServerRequest.schemaBodyJson(JoinLobby);
    const lobby = yield* repo.byCode(body.joinCode);
    const listener = yield* repo.addListener(lobby.id, body.username);
    return jsonOk({ lobby, listener });
  }).pipe(Effect.catchTag("LobbyNotFound", () => Effect.succeed(jsonErr("LobbyNotFound", 404)))),
);

const Kick = HttpRouter.add(
  "POST",
  "/api/lobbies/:id/kick",
  Effect.gen(function* () {
    const repo = yield* LobbyRepo;
    const params = yield* HttpRouter.schemaPathParams(IdParam);
    yield* repo.get(params.id);
    const body = yield* HttpServerRequest.schemaBodyJson(KickListener);
    yield* repo.removeListener(body.listenerId);
    return jsonOk({ ok: true });
  }).pipe(
    Effect.catchTag("LobbyNotFound", () => Effect.succeed(jsonErr("LobbyNotFound", 404))),
    Effect.catchTag("ListenerNotFound", () => Effect.succeed(jsonErr("ListenerNotFound", 404))),
  ),
);

const ListSources = HttpRouter.add(
  "GET",
  "/api/sources",
  Effect.gen(function* () {
    const sources = yield* Effect.tryPromise({
      try: listSources,
      catch: (cause) => new CaptureUnavailable({ reason: String(cause) }),
    });
    return jsonOk(sources);
  }).pipe(
    Effect.catchTag("CaptureUnavailable", () => Effect.succeed(jsonErr("CaptureUnavailable", 500))),
  ),
);

const CaptureStatus = HttpRouter.add(
  "GET",
  "/api/capture/status",
  Effect.gen(function* () {
    const streamer = yield* Streamer;
    const fault = yield* streamer.lastFault;
    return jsonOk({ error: fault ?? null });
  }),
);

const StartStream = HttpRouter.add(
  "POST",
  "/api/stream/start",
  Effect.gen(function* () {
    const streamer = yield* Streamer;
    const body = yield* HttpServerRequest.schemaBodyJson(StreamLobby);
    yield* streamer.start(body.lobbyId, body.source);
    return jsonOk({ ok: true });
  }).pipe(
    Effect.catchTag("LobbyNotFound", () => Effect.succeed(jsonErr("LobbyNotFound", 404))),
    Effect.catchTag("CaptureUnavailable", () => Effect.succeed(jsonErr("CaptureUnavailable", 500))),
  ),
);

const Stats = HttpRouter.add(
  "GET",
  "/api/stats",
  Effect.gen(function* () {
    const hub = yield* WsHub;
    const stats = yield* hub.stats;
    return jsonOk(stats);
  }),
);

const StopStream = HttpRouter.add(
  "POST",
  "/api/stream/stop",
  Effect.gen(function* () {
    const streamer = yield* Streamer;
    const body = yield* HttpServerRequest.schemaBodyJson(StreamLobby);
    yield* streamer.stop(body.lobbyId);
    return jsonOk({ ok: true });
  }),
);

const Routes = Layer.mergeAll(
  Health,
  ListLobbies,
  Create,
  GetLobby,
  PatchLobby,
  DeleteLobby,
  ListListeners,
  Kick,
  Join,
  ListSources,
  CaptureStatus,
  Stats,
  StartStream,
  StopStream,
  WsRoute,
);

export const HttpLive = HttpRouter.serve(Routes).pipe(
  Layer.provide(
    Streamer.layer.pipe(Layer.provideMerge(WsHub.layer), Layer.provideMerge(LobbyRepo.layer)),
  ),
  Layer.provide(BunHttpServer.layer({ hostname: "0.0.0.0", port: 5551 })),
);
