import { Schema } from "effect";

export class WsJoin extends Schema.TaggedClass<WsJoin>("WsJoin")("join", {
  joinCode: Schema.String,
  username: Schema.String,
  avatar: Schema.optional(Schema.String),
  pet: Schema.optional(Schema.String),
}) {}

export class WsLeave extends Schema.TaggedClass<WsLeave>("WsLeave")("leave", {}) {}

export class WsPose extends Schema.TaggedClass<WsPose>("WsPose")("pose", {
  x: Schema.Number,
  y: Schema.Number,
  dir: Schema.Literals(["down", "left", "right", "up"]),
  anim: Schema.Literals(["idle", "walk"]),
}) {}

export class WsSay extends Schema.TaggedClass<WsSay>("WsSay")("say", {
  text: Schema.String,
}) {}

export class WsRoll extends Schema.TaggedClass<WsRoll>("WsRoll")("roll", {
  sides: Schema.Literals([20]),
}) {}

export const WsInbound = Schema.Union([WsJoin, WsLeave, WsPose, WsSay, WsRoll]);

export type WsInbound = typeof WsInbound.Type;
