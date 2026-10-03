import { Schema } from "effect"

export class MicSource extends Schema.TaggedClass<MicSource>("MicSource")("mic", {
  id: Schema.String,
  name: Schema.String,
}) {}

export class AppSource extends Schema.TaggedClass<AppSource>("AppSource")("app", {
  pid: Schema.Number,
  name: Schema.String,
  bundleId: Schema.optional(Schema.String),
}) {}

export class FixtureSource extends Schema.TaggedClass<FixtureSource>("FixtureSource")("fixture", {
  name: Schema.Literals(["sine"]),
}) {}

export const AudioSource = Schema.Union([MicSource, AppSource, FixtureSource])
export type AudioSource = typeof AudioSource.Type
