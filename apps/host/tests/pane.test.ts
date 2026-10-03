import { describe, expect, it } from "@effect/vitest";
import {
  appRow,
  fixtureSine,
  formatHelp,
  formatList,
  formatLobbyLine,
  formatLog,
  formatPrompt,
  formatSourceLine,
  formatStats,
  initialSession,
  micRow,
  nextIndex,
  reduceKey,
  streamSourceBody,
} from "../src/pane.ts";

describe("formatList", () => {
  it("shows empty state", () => {
    expect(formatList([], 0, "No lobbies.")).toBe("No lobbies.");
  });

  it("marks the selected row", () => {
    const text = formatList(["one", "two"], 1, "empty");
    expect(text.includes("> two")).toBe(true);
    expect(text.includes("  one")).toBe(true);
  });
});

describe("formatLobbyLine", () => {
  it("shows code, count, and live", () => {
    expect(
      formatLobbyLine(
        { id: "b", name: "two", joinCode: "GHJKMN", listenerCount: 2, isStreaming: true },
        true,
      ),
    ).toBe("> two  GHJKMN  2  live");
  });
});

describe("formatSourceLine", () => {
  it("labels mic fixture and app", () => {
    expect(formatSourceLine(micRow("0", "Built-in"))).toBe("mic Built-in");
    expect(formatSourceLine(fixtureSine)).toBe("fixture sine");
    expect(formatSourceLine(appRow(12, "Music"))).toBe("app Music");
  });
});

describe("formatList listeners", () => {
  it("lists usernames", () => {
    const text = formatList(["alice", "bob"], 0, "No listeners connected");
    expect(text.includes("> alice")).toBe(true);
    expect(text.includes("  bob")).toBe(true);
  });
});

describe("formatStats", () => {
  it("renders hub totals", () => {
    const text = formatStats({ bytesOut: 2048, framesOut: 10, listeners: 2, dropped: 1 }, true);
    expect(text.includes("Status   live")).toBe(true);
    expect(text.includes("Bytes    2048")).toBe(true);
    expect(text.includes("Frames   10")).toBe(true);
    expect(text.includes("Peers    2")).toBe(true);
    expect(text.includes("Dropped  1")).toBe(true);
  });
});

describe("formatHelp", () => {
  it("shows rename and kick on the matching pane", () => {
    expect(formatHelp("lobbies", undefined).includes("r rename")).toBe(true);
    expect(formatHelp("listeners", undefined).includes("k kick")).toBe(true);
    expect(formatHelp("sources", undefined).includes("s start")).toBe(true);
  });
});

describe("formatPrompt", () => {
  it("shows the buffer", () => {
    expect(formatPrompt("create", "studio")).toBe("name: studio_");
    expect(formatPrompt("rename", "")).toBe("name: _");
  });
});

describe("formatLog", () => {
  it("keeps the last eight lines", () => {
    const lines = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    expect(formatLog(lines)).toBe("b\nc\nd\ne\nf\ng\nh\ni");
  });
});

describe("streamSourceBody", () => {
  it("maps mic and fixture", () => {
    expect(JSON.stringify(streamSourceBody(micRow("1", "Wave"))).includes("1")).toBe(true);
    expect(JSON.stringify(streamSourceBody(fixtureSine)).includes("sine")).toBe(true);
    expect(JSON.stringify(streamSourceBody(appRow(12, "Music"))).includes("12")).toBe(true);
  });
});

describe("nextIndex", () => {
  it("wraps", () => {
    expect(nextIndex(0, 3, -1)).toBe(2);
    expect(nextIndex(2, 3, 1)).toBe(0);
  });
});

describe("reduceKey", () => {
  const counts = { lobbies: 2, sources: 3, listeners: 2 };

  it("tabs between panes", () => {
    const [next] = reduceKey(initialSession(), { name: "tab", sequence: "\t" }, counts);
    expect(next.focus).toBe("lobbies");

    const [again] = reduceKey(next, { name: "tab", sequence: "\t" }, counts);
    expect(again.focus).toBe("listeners");
  });

  it("moves the focused list", () => {
    const session = { ...initialSession(), focus: "listeners" as const };
    const [next] = reduceKey(session, { name: "down", sequence: "" }, counts);
    expect(next.selectedListener).toBe(1);
  });

  it("opens a create prompt and submits the name", () => {
    let session = initialSession();
    session = reduceKey(session, { name: "n", sequence: "n" }, counts)[0];
    expect(session.prompt?.kind).toBe("create");
    session = reduceKey(session, { name: "a", sequence: "a" }, counts)[0];
    session = reduceKey(session, { name: "b", sequence: "b" }, counts)[0];

    const [done, action, name] = reduceKey(session, { name: "return", sequence: "\r" }, counts);
    expect(done.prompt).toBeUndefined();
    expect(action).toBe("create");
    expect(name).toBe("ab");
  });

  it("renames from the prompt", () => {
    let session = { ...initialSession(), focus: "lobbies" as const };
    session = reduceKey(session, { name: "r", sequence: "r" }, counts)[0];
    session = reduceKey(session, { name: "x", sequence: "x" }, counts)[0];

    const [, action, name] = reduceKey(session, { name: "enter", sequence: "\n" }, counts);
    expect(action).toBe("rename");
    expect(name).toBe("x");
  });

  it("emits kick close start stop copy quit", () => {
    expect(reduceKey(initialSession(), { name: "s", sequence: "s" }, counts)[1]).toBe("start");
    expect(reduceKey(initialSession(), { name: "x", sequence: "x" }, counts)[1]).toBe("stop");
    expect(reduceKey(initialSession(), { name: "c", sequence: "c" }, counts)[1]).toBe("close");
    expect(reduceKey(initialSession(), { name: "y", sequence: "y" }, counts)[1]).toBe("copy");
    expect(reduceKey(initialSession(), { name: "q", sequence: "q" }, counts)[1]).toBe("quit");

    const listening = { ...initialSession(), focus: "listeners" as const };
    expect(reduceKey(listening, { name: "k", sequence: "k" }, counts)[1]).toBe("kick");
  });

  it("types q inside a name prompt instead of quitting", () => {
    const open = reduceKey(initialSession(), { name: "n", sequence: "n" }, counts)[0];
    const [typed, action] = reduceKey(open, { name: "q", sequence: "q" }, counts);
    expect(action).toBe("none");
    expect(typed.prompt?.buffer).toBe("q");
  });

  it("cancels the prompt on escape", () => {
    const open = reduceKey(initialSession(), { name: "n", sequence: "n" }, counts)[0];
    const [closed, action] = reduceKey(open, { name: "escape", sequence: "\u001b" }, counts);
    expect(closed.prompt).toBeUndefined();
    expect(action).toBe("none");
  });
});
