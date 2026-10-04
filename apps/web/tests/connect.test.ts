import { describe, expect, it } from "@effect/vitest";
import { shouldConnect } from "../src/connect.ts";

describe("shouldConnect", () => {
  it("lets the first attempt through and blocks a second auto start", () => {
    expect(shouldConnect(false, false)).toBe(true);
    expect(shouldConnect(true, false)).toBe(false);
  });

  it("lets Join retry even if an earlier attempt is stuck", () => {
    expect(shouldConnect(true, true)).toBe(true);
  });
});
