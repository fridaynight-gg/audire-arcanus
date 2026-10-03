export type LobbyRow = {
  id: string;
  name: string;
  joinCode: string;
  listenerCount: number;
  isStreaming: boolean;
};

export const formatLobbyPane = (lobbies: ReadonlyArray<LobbyRow>, selected: number): string => {
  const header = "Audire Arcanus  :5551";
  const help = "n create  up/down  q quit";
  if (lobbies.length === 0) {
    return [header, "", "No lobbies.", "", help].join("\n");
  }
  const rows = lobbies.map((lobby, index) => {
    const mark = index === selected ? ">" : " ";
    const live = lobby.isStreaming ? "live" : "idle";
    return `${mark} ${lobby.name}  ${lobby.joinCode}  ${String(lobby.listenerCount)}  ${live}`;
  });
  return [header, "", ...rows, "", help].join("\n");
};

export const nextIndex = (selected: number, count: number, delta: number): number => {
  if (count === 0) {
    return 0;
  }
  return (selected + delta + count) % count;
};
