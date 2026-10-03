import { describe, expect, it } from "@effect/vitest";
import { listSources, parseHelperEvent, startCapture } from "../src/capture.ts";

describe("capture", () => {
  it("lists fixture sine, a mic, and an app", async () => {
    const sources = (await listSources()) as Array<{ readonly _tag: string }>;
    expect(sources.some((source) => source._tag === "fixture")).toBe(true);
    expect(sources.some((source) => source._tag === "mic")).toBe(true);
    expect(sources.some((source) => source._tag === "app")).toBe(true);
  });

  it("parses PermissionDenied helper events", () => {
    const event = parseHelperEvent('{"event":"error","tag":"PermissionDenied","message":"TCC"}\n');
    expect(event).toEqual({ tag: "PermissionDenied", message: "TCC" });
  });

  it("kills fixture helper on abort", async () => {
    const ac = new AbortController();
    let frames = 0;
    const run = startCapture(["--fixture", "sine"], ac.signal, async () => {
      frames += 1;
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 80);
    });
    expect(frames).toBeGreaterThan(0);
    ac.abort();
    await run;
  });
});
