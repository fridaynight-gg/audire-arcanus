import { Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/http"
import { BunHttpServer } from "@effect/platform-bun"

const Health = HttpRouter.add("GET", "/health", HttpServerResponse.jsonUnsafe({ ok: true }))

export const HttpLive = HttpRouter.serve(Health).pipe(
  Layer.provide(BunHttpServer.layer({ hostname: "0.0.0.0", port: 5551 })),
)
