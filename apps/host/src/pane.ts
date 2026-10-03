import { defaultTheme, themeNames } from "./theme.ts";

export type LobbyRow = {
  id: string;
  name: string;
  joinCode: string;
  listenerCount: number;
  isStreaming: boolean;
};

export type SourceRow =
  | { readonly _tag: "fixture"; readonly name: "sine" }
  | { readonly _tag: "mic"; readonly id: string; readonly name: string }
  | {
      readonly _tag: "app";
      readonly pid: number;
      readonly name: string;
      readonly bundleId?: string;
    };

export type ListenerRow = {
  readonly id: string;
  readonly username: string;
};

export type StatsRow = {
  readonly bytesOut: number;
  readonly framesOut: number;
  readonly listeners: number;
  readonly dropped: number;
};

export type FocusPane = "sources" | "lobbies" | "listeners";

export type PromptKind = "create" | "rename";

export type PickerKind = "theme";

export type ThemePicker = {
  readonly kind: "theme";
  readonly selected: number;
  readonly revert: string;
};

export type Action =
  | "none"
  | "create"
  | "rename"
  | "close"
  | "kick"
  | "start"
  | "stop"
  | "copy"
  | "quit"
  | "theme";

export type KeyStroke = {
  readonly name: string;
  readonly sequence: string;
};

export type Session = {
  readonly focus: FocusPane;
  readonly selected: number;
  readonly selectedSource: number;
  readonly selectedListener: number;
  readonly theme: string;
  readonly prompt: { readonly kind: PromptKind; readonly buffer: string } | undefined;
  readonly picker: ThemePicker | undefined;
};

export type SessionCounts = {
  readonly lobbies: number;
  readonly sources: number;
  readonly listeners: number;
};

const panes: ReadonlyArray<FocusPane> = ["sources", "lobbies", "listeners"];

export const initialSession = (): Session => ({
  focus: "sources",
  selected: 0,
  selectedSource: 0,
  selectedListener: 0,
  theme: defaultTheme,
  prompt: undefined,
  picker: undefined,
});

export const micRow = (id: string, name: string): SourceRow => {
  return { _tag: "mic", id, name };
};

export const appRow = (pid: number, name: string): SourceRow => {
  return { _tag: "app", pid, name };
};

export const fixtureSine: SourceRow = { _tag: "fixture", name: "sine" };

export const formatSourceLine = (source: SourceRow): string => {
  if (source._tag === "mic") {
    return `mic ${source.name}`;
  }

  if (source._tag === "app") {
    return `app ${source.name}`;
  }

  return "fixture sine";
};

export const canStream = (_source: SourceRow): boolean => true;

export const streamSourceBody = (
  source: SourceRow,
):
  | { readonly _tag: "mic"; readonly id: string }
  | { readonly _tag: "fixture"; readonly name: "sine" }
  | { readonly _tag: "app"; readonly pid: number } => {
  if (source._tag === "mic") {
    return { _tag: "mic", id: source.id };
  }

  if (source._tag === "app") {
    return { _tag: "app", pid: source.pid };
  }

  return { _tag: "fixture", name: "sine" };
};

export const formatList = (
  lines: ReadonlyArray<string>,
  selected: number,
  empty: string,
): string => {
  if (lines.length === 0) {
    return empty;
  }

  return lines.map((line, index) => `${index === selected ? ">" : " "} ${line}`).join("\n");
};

export const formatLobbyLine = (lobby: LobbyRow, selected: boolean): string => {
  const mark = selected ? ">" : " ";
  const live = lobby.isStreaming ? "live" : "idle";

  return `${mark} ${lobby.name}  ${lobby.joinCode}  ${String(lobby.listenerCount)}  ${live}`;
};

export const formatStats = (stats: StatsRow, live: boolean): string => {
  const status = live ? "live" : "idle";

  return [
    `Status   ${status}`,
    `Bytes    ${String(stats.bytesOut)}`,
    `Frames   ${String(stats.framesOut)}`,
    `Peers    ${String(stats.listeners)}`,
    `Dropped  ${String(stats.dropped)}`,
  ].join("\n");
};

export const formatHelp = (
  focus: FocusPane,
  prompt: PromptKind | undefined,
  picker: PickerKind | undefined = undefined,
): string => {
  if (picker === "theme") {
    return "up/down  enter apply  esc cancel";
  }

  if (prompt !== undefined) {
    return "enter ok  esc cancel";
  }

  if (focus === "lobbies") {
    return "tab panel  n new  r rename  c close  y copy  s start  x stop  t theme  q quit";
  }

  if (focus === "listeners") {
    return "tab panel  up/down  k kick  t theme  q quit";
  }

  return "tab panel  up/down source  s start  x stop  t theme  q quit";
};

export const formatPrompt = (_kind: PromptKind, buffer: string): string => `name: ${buffer}_`;

export const formatLog = (lines: ReadonlyArray<string>): string => {
  const keep = lines.length <= 8 ? lines : lines.slice(lines.length - 8);

  return keep.join("\n");
};

export const nextIndex = (selected: number, count: number, delta: number): number => {
  if (count === 0) {
    return 0;
  }

  return (selected + delta + count) % count;
};

const nextPane = (focus: FocusPane, delta: number): FocusPane =>
  panes[nextIndex(panes.indexOf(focus), panes.length, delta)] ?? "sources";

const isEnter = (name: string): boolean => name === "return" || name === "enter";

const isTypingKey = (name: string): boolean =>
  name.length === 1 && name !== "\t" && name !== "\n" && name !== "\r";

export const reduceKey = (
  session: Session,
  key: KeyStroke,
  counts: SessionCounts,
): [Session, Action, string] => {
  if (session.picker !== undefined) {
    if (key.name === "escape") {
      return [{ ...session, picker: undefined, theme: session.picker.revert }, "none", ""];
    }

    if (isEnter(key.name)) {
      const name = themeNames[session.picker.selected] ?? session.theme;

      return [{ ...session, picker: undefined, theme: name }, "theme", name];
    }

    if (key.name === "up" || key.name === "down") {
      const delta = key.name === "up" ? -1 : 1;

      return [
        {
          ...session,
          picker: {
            kind: "theme",
            selected: nextIndex(session.picker.selected, themeNames.length, delta),
            revert: session.picker.revert,
          },
        },
        "none",
        "",
      ];
    }

    return [session, "none", ""];
  }

  if (session.prompt !== undefined) {
    if (key.name === "escape") {
      return [{ ...session, prompt: undefined }, "none", ""];
    }

    if (isEnter(key.name)) {
      const name = session.prompt.buffer.trim();

      if (name.length === 0) {
        return [{ ...session, prompt: undefined }, "none", ""];
      }

      return [{ ...session, prompt: undefined }, session.prompt.kind, name];
    }

    if (key.name === "backspace" || key.name === "delete") {
      return [
        {
          ...session,
          prompt: { kind: session.prompt.kind, buffer: session.prompt.buffer.slice(0, -1) },
        },
        "none",
        "",
      ];
    }

    if (isTypingKey(key.name)) {
      return [
        {
          ...session,
          prompt: { kind: session.prompt.kind, buffer: session.prompt.buffer + key.name },
        },
        "none",
        "",
      ];
    }

    return [session, "none", ""];
  }

  if (key.name === "tab") {
    return [{ ...session, focus: nextPane(session.focus, 1) }, "none", ""];
  }

  if (key.name === "up" || key.name === "down") {
    const delta = key.name === "up" ? -1 : 1;

    if (session.focus === "sources") {
      return [
        { ...session, selectedSource: nextIndex(session.selectedSource, counts.sources, delta) },
        "none",
        "",
      ];
    }

    if (session.focus === "listeners") {
      return [
        {
          ...session,
          selectedListener: nextIndex(session.selectedListener, counts.listeners, delta),
        },
        "none",
        "",
      ];
    }

    return [
      { ...session, selected: nextIndex(session.selected, counts.lobbies, delta) },
      "none",
      "",
    ];
  }

  if (key.name === "left" || key.name === "right") {
    const delta = key.name === "left" ? -1 : 1;

    return [
      { ...session, selectedSource: nextIndex(session.selectedSource, counts.sources, delta) },
      "none",
      "",
    ];
  }

  if (key.name === "n") {
    return [{ ...session, focus: "lobbies", prompt: { kind: "create", buffer: "" } }, "none", ""];
  }

  if (key.name === "r") {
    return [{ ...session, focus: "lobbies", prompt: { kind: "rename", buffer: "" } }, "none", ""];
  }

  if (key.name === "s") {
    return [session, "start", ""];
  }

  if (key.name === "x") {
    return [session, "stop", ""];
  }

  if (key.name === "c") {
    return [session, "close", ""];
  }

  if (key.name === "y") {
    return [session, "copy", ""];
  }

  if (key.name === "k") {
    return [session, "kick", ""];
  }

  if (key.name === "q") {
    return [session, "quit", ""];
  }

  if (key.name === "t") {
    const selected = Math.max(
      0,
      themeNames.findIndex((id) => id === session.theme),
    );

    return [
      {
        ...session,
        picker: { kind: "theme", selected, revert: session.theme },
      },
      "none",
      "",
    ];
  }

  return [session, "none", ""];
};
