import { Effect, Layer } from "effect";
import { HttpLive } from "@audire/server";
import { BoxRenderable, TextRenderable, createCliRenderer } from "@opentui/core";
import {
  formatLobbyPane,
  nextIndex,
  streamSourceBody,
  type LobbyRow,
  type SourceRow,
} from "./pane.ts";

const base = "http://127.0.0.1:5551";

const listLobbies = async (): Promise<Array<LobbyRow>> => {
  const res = await fetch(`${base}/api/lobbies`);
  return (await res.json()) as Array<LobbyRow>;
};

const listSources = async (): Promise<Array<SourceRow>> => {
  const res = await fetch(`${base}/api/sources`);
  return (await res.json()) as Array<SourceRow>;
};

const createLobby = async (name: string): Promise<void> => {
  await fetch(`${base}/api/lobbies`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
};

const postStream = async (path: string, body: unknown): Promise<void> => {
  await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
};

Effect.runFork(Layer.launch(HttpLive));

const renderer = await createCliRenderer({ exitOnCtrlC: true });
const box = new BoxRenderable(renderer, {
  border: true,
  title: "Lobbies",
  flexGrow: 1,
});
const text = new TextRenderable(renderer, { content: formatLobbyPane([], 0) });
box.add(text);
renderer.root.add(box);

let selected = 0;
let selectedSource = 0;
let lobbies: Array<LobbyRow> = [];
let sources: Array<SourceRow> = [];

const paint = () => {
  text.content = formatLobbyPane(lobbies, selected, sources, selectedSource);
};

const refresh = async () => {
  lobbies = await listLobbies();
  sources = await listSources();
  if (selected >= lobbies.length) {
    selected = Math.max(0, lobbies.length - 1);
  }
  if (selectedSource >= sources.length) {
    selectedSource = Math.max(0, sources.length - 1);
  }
  paint();
};

renderer.keyInput.on("keypress", (key) => {
  if (key.name === "n") {
    void createLobby(`lobby-${String(lobbies.length + 1)}`).then(refresh);
    return;
  }
  if (key.name === "up") {
    selected = nextIndex(selected, lobbies.length, -1);
    paint();
    return;
  }
  if (key.name === "down") {
    selected = nextIndex(selected, lobbies.length, 1);
    paint();
    return;
  }
  if (key.name === "left") {
    selectedSource = nextIndex(selectedSource, sources.length, -1);
    paint();
    return;
  }
  if (key.name === "right") {
    selectedSource = nextIndex(selectedSource, sources.length, 1);
    paint();
    return;
  }
  if (key.name === "s") {
    const lobby = lobbies[selected];
    const source = sources[selectedSource];
    if (lobby === undefined || source === undefined) {
      return;
    }
    void postStream("/api/stream/start", {
      lobbyId: lobby.id,
      source: streamSourceBody(source),
    }).then(refresh);
    return;
  }
  if (key.name === "x") {
    const lobby = lobbies[selected];
    if (lobby === undefined) {
      return;
    }
    void postStream("/api/stream/stop", { lobbyId: lobby.id }).then(refresh);
  }
});

await refresh();
setInterval(() => {
  void refresh();
}, 1000);
