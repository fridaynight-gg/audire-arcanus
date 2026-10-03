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

export const formatLobbyPane = (
  lobbies: ReadonlyArray<LobbyRow>,
  selected: number,
  sources: ReadonlyArray<SourceRow> = [],
  selectedSource = 0,
): string => {
  const header = "Audire Arcanus  :5551";
  const help = "n create  s start  x stop  left/right source  up/down lobby";
  const lobbyBlock =
    lobbies.length === 0
      ? ["No lobbies."]
      : lobbies.map((lobby, index) => {
          const mark = index === selected ? ">" : " ";
          const live = lobby.isStreaming ? "live" : "idle";
          return `${mark} ${lobby.name}  ${lobby.joinCode}  ${String(lobby.listenerCount)}  ${live}`;
        });
  const sourceBlock =
    sources.length === 0
      ? ["No sources."]
      : sources.map((source, index) => {
          const mark = index === selectedSource ? ">" : " ";
          return `${mark} ${formatSourceLine(source)}`;
        });
  return [header, "", ...lobbyBlock, "", "Sources", ...sourceBlock, "", help].join("\n");
};

export const nextIndex = (selected: number, count: number, delta: number): number => {
  if (count === 0) {
    return 0;
  }
  return (selected + delta + count) % count;
};
