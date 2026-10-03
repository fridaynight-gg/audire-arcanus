const help = `audire
  serve              start HTTP on :5551
  lobby create NAME  create a lobby
  lobby list         list lobbies
  --help
`;

const base = "http://127.0.0.1:5551";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(help);
  process.exit(0);
}

const [, , cmd, sub, ...rest] = process.argv;

if (cmd === "lobby" && sub === "list") {
  const res = await fetch(`${base}/api/lobbies`);
  console.log(await res.text());
  process.exit(0);
}

if (cmd === "lobby" && sub === "create") {
  const name = rest[0] ?? "lobby";
  const res = await fetch(`${base}/api/lobbies`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  console.log(await res.text());
  process.exit(0);
}

if (cmd !== undefined && cmd !== "serve") {
  console.error(help);
  process.exit(1);
}

const { Layer } = await import("effect");
const { BunRuntime } = await import("@effect/platform-bun");
const { HttpLive } = await import("@audire/server");

BunRuntime.runMain(Layer.launch(HttpLive));
