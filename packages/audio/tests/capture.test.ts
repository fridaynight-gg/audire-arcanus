import { describe, expect, it } from "@effect/vitest";
import { listSources } from "../src/capture.ts";

describe("capture", () => {
  it("lists fixture sine and at least one mic", async () => {
    const sources = (await listSources()) as Array<{ readonly _tag: string }>;
    expect(sources.some((source) => source._tag === "fixture")).toBe(true);
    expect(sources.some((source) => source._tag === "mic")).toBe(true);
  });
});
