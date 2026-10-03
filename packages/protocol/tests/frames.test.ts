import { describe, expect, it } from "@effect/vitest";
import { decodeFrame, encodeFrame, FrameType } from "../src/frames.ts";

describe("frames", () => {
  it("roundtrips a control payload", () => {
    const payload = new TextEncoder().encode("hi");
    const encoded = encodeFrame(FrameType.control, payload);
    const decoded = decodeFrame(encoded);
    expect(decoded?.type).toBe(FrameType.control);
    expect(new TextDecoder().decode(decoded?.payload ?? new Uint8Array())).toBe("hi");
  });
});
