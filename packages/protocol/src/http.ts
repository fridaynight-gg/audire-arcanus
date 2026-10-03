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
