import { Schema } from "effect";
import { JoinCode, LobbyId } from "@audire/domain";

export class CreateLobby extends Schema.Class<CreateLobby>("CreateLobby")({
  name: Schema.String,
}) {}

export class RenameLobby extends Schema.Class<RenameLobby>("RenameLobby")({
  name: Schema.String,
}) {}

export class KickListener extends Schema.Class<KickListener>("KickListener")({
  listenerId: Schema.String,
}) {}

export class JoinLobby extends Schema.Class<JoinLobby>("JoinLobby")({
  joinCode: JoinCode,
  username: Schema.String,
}) {}

export class IdParam extends Schema.Class<IdParam>("IdParam")({
  id: LobbyId,
}) {}

export class StreamMic extends Schema.TaggedClass<StreamMic>("StreamMic")("mic", {
  id: Schema.String,
}) {}

export class StreamFixture extends Schema.TaggedClass<StreamFixture>("StreamFixture")("fixture", {
  name: Schema.Literals(["sine"]),
}) {}

export class StreamApp extends Schema.TaggedClass<StreamApp>("StreamApp")("app", {
  pid: Schema.Number,
}) {}

export const StreamSource = Schema.Union([StreamMic, StreamFixture, StreamApp]);
export type StreamSource = typeof StreamSource.Type;

export class StreamLobby extends Schema.Class<StreamLobby>("StreamLobby")({
  lobbyId: LobbyId,
  source: Schema.optional(StreamSource),
}) {}
