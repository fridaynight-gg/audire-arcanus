import { describe, expect, it } from "@effect/vitest";
import { createOpusEncoder } from "../src/opus.ts";

describe("opus", () => {
  it("encodes a 20ms stereo frame smaller than PCM", async () => {
    const encoder = await createOpusEncoder();
    const pcm = new Uint8Array(3840);
    const packet = encoder.encode(pcm);
    expect(packet.length).toBeGreaterThan(0);
    expect(packet.length).toBeLessThan(3840);
    encoder.free();
  });
});
