import { Effect, Layer } from "effect";
import { HttpLive } from "@audire/server";
import { BoxRenderable, TextRenderable, createCliRenderer } from "@opentui/core";
import { formatLobbyPane, nextIndex, type LobbyRow } from "./pane.ts";

const base = "http://127.0.0.1:5551";

const listLobbies = async (): Promise<Array<LobbyRow>> => {
  const res = await fetch(`${base}/api/lobbies`);
  return (await res.json()) as Array<LobbyRow>;
};

const createLobby = async (name: string): Promise<void> => {
  await fetch(`${base}/api/lobbies`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
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
let lobbies: Array<LobbyRow> = [];

const refresh = async () => {
  lobbies = await listLobbies();
  if (selected >= lobbies.length) {
    selected = Math.max(0, lobbies.length - 1);
  }
  text.content = formatLobbyPane(lobbies, selected);
};

renderer.keyInput.on("keypress", (key) => {
  if (key.name === "n") {
    void createLobby(`lobby-${String(lobbies.length + 1)}`).then(refresh);
    return;
  }
  if (key.name === "up") {
    selected = nextIndex(selected, lobbies.length, -1);
    text.content = formatLobbyPane(lobbies, selected);
    return;
  }
  if (key.name === "down") {
    selected = nextIndex(selected, lobbies.length, 1);
    text.content = formatLobbyPane(lobbies, selected);
  }
});

await refresh();
setInterval(() => {
  void refresh();
}, 1000);
