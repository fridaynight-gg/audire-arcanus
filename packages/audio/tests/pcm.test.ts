import { describe, expect, it } from "@effect/vitest";
import { splitPcm } from "../src/pcm.ts";

describe("splitPcm", () => {
  it("yields complete length-prefixed frames", () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3]);
    const buf = new Uint8Array(4 + 2 + 4 + 1);
    new DataView(buf.buffer).setUint32(0, 2, true);
    buf.set(a, 4);
    new DataView(buf.buffer).setUint32(6, 1, true);
    buf.set(b, 10);
    const { frames, rest } = splitPcm(buf);
    expect(frames).toEqual([a, b]);
    expect(rest.length).toBe(0);
  });
});
