import { describe, expect, it } from "@effect/vitest";
import { formatLobbyPane, nextIndex, streamSourceBody } from "../src/pane.ts";

describe("formatLobbyPane", () => {
  it("shows empty state", () => {
    const text = formatLobbyPane([], 0);
    expect(text.includes("No lobbies.")).toBe(true);
    expect(text.includes("No sources.")).toBe(true);
    expect(text.includes("s start")).toBe(true);
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

  it("marks the selected source", () => {
    const text = formatLobbyPane(
      [{ id: "a", name: "one", joinCode: "ABCDEF", listenerCount: 0, isStreaming: false }],
      0,
      [
        { _tag: "fixture", name: "sine" },
        { _tag: "mic", id: "0", name: "Built-in" },
        { _tag: "app", pid: 12, name: "Music" },
      ],
      1,
    );
    expect(text.includes("> mic Built-in")).toBe(true);
    expect(text.includes("  fixture sine")).toBe(true);
    expect(text.includes("  app Music")).toBe(true);
  });
});

describe("streamSourceBody", () => {
  it("maps mic and fixture", () => {
    expect(streamSourceBody({ _tag: "mic", id: "1", name: "Wave" })).toEqual({
      _tag: "mic",
      id: "1",
    });
    expect(streamSourceBody({ _tag: "fixture", name: "sine" })).toEqual({
      _tag: "fixture",
      name: "sine",
    });
    expect(streamSourceBody({ _tag: "app", pid: 12, name: "Music" })).toEqual({
      _tag: "app",
      pid: 12,
    });
  });
});

describe("nextIndex", () => {
  it("wraps", () => {
    expect(nextIndex(0, 3, -1)).toBe(2);
    expect(nextIndex(2, 3, 1)).toBe(0);
  });
});
