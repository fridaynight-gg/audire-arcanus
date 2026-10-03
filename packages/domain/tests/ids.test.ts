import { describe, expect, it } from "@effect/vitest";
import { makeJoinCode } from "../src/ids.ts";

describe("makeJoinCode", () => {
  it("emits six crockford characters", () => {
    const code = makeJoinCode(Uint8Array.from([1, 2, 3, 4, 5, 6]));
    expect(code).toHaveLength(6);
    expect(/^[ABCDEFGHJKMNPQRSTVWXYZ23456789]{6}$/.test(code)).toBe(true);
  });
});
