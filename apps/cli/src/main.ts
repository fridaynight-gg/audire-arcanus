const help = `audire
  serve [--loopback]    start HTTP on :5551 (loopback = 127.0.0.1)
  lobby create NAME     create a lobby
  lobby list            list lobbies
  sources               list capture sources
  stream start LOBBY_ID [--fixture sine | --mic ID | --app PID]
  stream stop LOBBY_ID
  stats                 bytes/frames/listeners
  --help
`;

const base = "http://127.0.0.1:5551";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(help);
  process.exit(0);
}

const [, , cmd, sub, ...rest] = process.argv;

const postJson = async (path: string, body: unknown): Promise<string> => {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return await res.text();
};

if (cmd === "lobby" && sub === "list") {
  const res = await fetch(`${base}/api/lobbies`);
  console.log(await res.text());
  process.exit(0);
}

if (cmd === "sources") {
  const res = await fetch(`${base}/api/sources`);
  console.log(await res.text());
  process.exit(0);
}

if (cmd === "stats") {
  const res = await fetch(`${base}/api/stats`);
  console.log(await res.text());
  process.exit(0);
}

if (cmd === "lobby" && sub === "create") {
  const name = rest[0] ?? "lobby";
  console.log(await postJson("/api/lobbies", { name }));
  process.exit(0);
}

if (cmd === "stream" && sub === "stop") {
  const lobbyId = rest[0];
  if (lobbyId === undefined) {
    console.error(help);
    process.exit(1);
  }
  console.log(await postJson("/api/stream/stop", { lobbyId }));
  process.exit(0);
}

if (cmd === "stream" && sub === "start") {
  const lobbyId = rest[0];
  if (lobbyId === undefined) {
    console.error(help);
    process.exit(1);
  }
  const micAt = rest.indexOf("--mic");
  const appAt = rest.indexOf("--app");
  const source =
    appAt >= 0
      ? { _tag: "app", pid: Number(rest[appAt + 1] ?? "0") }
      : micAt >= 0
        ? { _tag: "mic", id: rest[micAt + 1] ?? "default" }
        : { _tag: "fixture", name: "sine" };
  console.log(await postJson("/api/stream/start", { lobbyId, source }));
  process.exit(0);
}

if (cmd !== undefined && cmd !== "serve") {
  console.error(help);
  process.exit(1);
}

const { Layer } = await import("effect");
const { BunRuntime } = await import("@effect/platform-bun");
const { makeHttpLive } = await import("@audire/server");

const hostname = process.argv.includes("--loopback") ? "127.0.0.1" : "0.0.0.0";
BunRuntime.runMain(Layer.launch(makeHttpLive(hostname)));
