import { Effect, Layer } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import { BunHttpServer } from "@effect/platform-bun";
import { CreateLobby, IdParam, JoinLobby, KickListener, RenameLobby } from "@audire/protocol";
import { LobbyRepo } from "./lobby-repo.ts";
import { WsHub } from "./ws-hub.ts";
import { WsRoute } from "./ws.ts";

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
  WsRoute,
);

export const HttpLive = HttpRouter.serve(Routes).pipe(
  Layer.provide(LobbyRepo.layer),
  Layer.provide(WsHub.layer),
  Layer.provide(BunHttpServer.layer({ hostname: "0.0.0.0", port: 5551 })),
);
