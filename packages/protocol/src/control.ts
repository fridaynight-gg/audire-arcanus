import { Schema } from "effect";

export class WsJoin extends Schema.TaggedClass<WsJoin>("WsJoin")("join", {
  joinCode: Schema.String,
  username: Schema.String,
  avatar: Schema.optional(Schema.String),
  pet: Schema.optional(Schema.String),
}) {}

export class WsLeave extends Schema.TaggedClass<WsLeave>("WsLeave")("leave", {}) {}

export const WsInbound = Schema.Union([WsJoin, WsLeave]);

export type WsInbound = typeof WsInbound.Type;
