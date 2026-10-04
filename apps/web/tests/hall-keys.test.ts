import { describe, expect, it } from "@effect/vitest";
import { routeHallKey } from "../src/hall-keys.ts";

describe("routeHallKey", () => {
  it("ignores keys while typing in an input except it does not freeze walk from a bare enter on the canvas", () => {
    expect(routeHallKey("Enter", false)).toBe("focus-say");
    expect(routeHallKey("Enter", true)).toBe("ignore");
    expect(routeHallKey("a", true)).toBe("ignore");
    expect(routeHallKey("a", false)).toBe("walk");
    expect(routeHallKey("ArrowUp", false)).toBe("walk");
    expect(routeHallKey("r", false)).toBe("roll");
    expect(routeHallKey("r", true)).toBe("ignore");
  });
});
