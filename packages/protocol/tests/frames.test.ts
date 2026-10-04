import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";
import { WsInbound } from "../src/control.ts";
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

describe("WsInbound", () => {
  it("decodes say and roll", () => {
    const say = Schema.decodeUnknownSync(WsInbound)({ _tag: "say", text: "hello inn" });
    expect(say._tag).toBe("say");
    const roll = Schema.decodeUnknownSync(WsInbound)({ _tag: "roll", sides: 20 });
    expect(roll._tag).toBe("roll");
  });
});
