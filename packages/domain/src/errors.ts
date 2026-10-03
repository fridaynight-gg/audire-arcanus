import { Schema } from "effect"
import { JoinCode, ListenerId, LobbyId } from "./ids.ts"

export class LobbyNotFound extends Schema.TaggedError<LobbyNotFound>()("LobbyNotFound", {
  lobbyId: Schema.optional(LobbyId),
  joinCode: Schema.optional(JoinCode),
}) {}

export class ListenerNotFound extends Schema.TaggedError<ListenerNotFound>()("ListenerNotFound", {
  listenerId: ListenerId,
}) {}

export class AlreadyJoined extends Schema.TaggedError<AlreadyJoined>()("AlreadyJoined", {
  listenerId: ListenerId,
}) {}

export class CaptureUnavailable extends Schema.TaggedError<CaptureUnavailable>()("CaptureUnavailable", {
  reason: Schema.String,
}) {}

export class PermissionDenied extends Schema.TaggedError<PermissionDenied>()("PermissionDenied", {
  source: Schema.String,
}) {}

export class UnsupportedPlatform extends Schema.TaggedError<UnsupportedPlatform>()("UnsupportedPlatform", {
  platform: Schema.String,
  feature: Schema.String,
}) {}
