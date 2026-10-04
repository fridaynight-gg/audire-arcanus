import { Schema } from "effect";
import { JoinCode, LobbyId, ListenerId, Username } from "./ids.ts";

export class Lobby extends Schema.Class<Lobby>("Lobby")({
  id: LobbyId,
  name: Schema.String,
  joinCode: JoinCode,
  createdAt: Schema.Date,
  listenerCount: Schema.Number,
  isStreaming: Schema.Boolean,
}) {}

export class Listener extends Schema.Class<Listener>("Listener")({
  id: ListenerId,
  lobbyId: LobbyId,
  username: Username,
  avatar: Schema.optional(Schema.String),
  pet: Schema.optional(Schema.String),
  connectedAt: Schema.Date,
}) {}
