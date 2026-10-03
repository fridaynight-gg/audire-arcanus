import { describe, expect, it } from "@effect/vitest";
import { formatLobbyPane, nextIndex } from "../src/pane.ts";

describe("formatLobbyPane", () => {
  it("shows empty state", () => {
    const text = formatLobbyPane([], 0);
    expect(text.includes("No lobbies.")).toBe(true);
    expect(text.includes("n create")).toBe(true);
  });

  it("marks the selected lobby", () => {
    const text = formatLobbyPane(
      [
        { id: "a", name: "one", joinCode: "ABCDEF", listenerCount: 0, isStreaming: false },
        { id: "b", name: "two", joinCode: "GHJKMN", listenerCount: 2, isStreaming: true },
      ],
      1,
    );
    expect(text.includes("> two  GHJKMN  2  live")).toBe(true);
    expect(text.includes("  one  ABCDEF  0  idle")).toBe(true);
  });
});

describe("nextIndex", () => {
  it("wraps", () => {
    expect(nextIndex(0, 3, -1)).toBe(2);
    expect(nextIndex(2, 3, 1)).toBe(0);
  });
});
