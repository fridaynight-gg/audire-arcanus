import { Effect, Layer } from "effect";
import { HttpLive } from "@audire/server";
import { createCliRenderer, TextRenderable } from "@opentui/core";

Effect.runFork(Layer.launch(HttpLive));

const renderer = await createCliRenderer({ exitOnCtrlC: true });
renderer.root.add(new TextRenderable(renderer, { content: "Audire Arcanus — :5551" }));
