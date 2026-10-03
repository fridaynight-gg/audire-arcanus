import { Effect, Fiber, Layer, Logger } from "effect";
import { HttpLive, makeHttpLive } from "@audire/server";
import { BoxRenderable, TextRenderable, createCliRenderer } from "@opentui/core";
import {
  canStream,
  formatHelp,
  formatList,
  formatLobbyLine,
  formatLog,
  formatPrompt,
  formatSourceLine,
  formatStats,
  initialSession,
  reduceKey,
  streamSourceBody,
  type Action,
  type ListenerRow,
  type LobbyRow,
  type Session,
  type SourceRow,
  type StatsRow,
} from "./pane.ts";

const theme = {
  bg: "#1a1b26",
  panel: "#16161e",
  header: "#24283b",
  fg: "#c0caf5",
  dim: "#565f89",
  border: "#3b4261",
  focus: "#7aa2f7",
  blue: "#7aa2f7",
  yellow: "#e0af68",
};

const loopback = process.argv.includes("--loopback");

const host = loopback ? "127.0.0.1" : "0.0.0.0";

const base = "http://127.0.0.1:5551";

const readText = async (path: string): Promise<string> => {
  const res = await fetch(`${base}${path}`);

  return await res.text();
};

const postText = async (path: string, method: string, body: string): Promise<void> => {
  await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body,
  });
};

const httpFiber = Effect.runFork(
  Layer.launch(loopback ? makeHttpLive("127.0.0.1") : HttpLive).pipe(
    Effect.provide(Logger.layer([])),
  ),
);

let shutdownStarted = false;

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  backgroundColor: theme.bg,
  useMouse: true,
});

const halt = () => {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;

  void fetch(`${base}/api/shutdown`, { method: "POST" })
    .catch(() => undefined)
    .finally(() => {
      Effect.runFork(Fiber.interrupt(httpFiber));
      renderer.destroy();
      process.exit(0);
    });
};

process.on("SIGINT", halt);

process.on("SIGTERM", halt);

renderer.root.flexDirection = "column";

const panel = (title: string, grow: number): [BoxRenderable, TextRenderable] => {
  const box = new BoxRenderable(renderer, {
    border: true,
    title,
    titleColor: theme.fg,
    backgroundColor: theme.panel,
    borderColor: theme.border,
    focusedBorderColor: theme.focus,
    flexGrow: grow,
    flexDirection: "column",
    padding: 1,
  });

  const text = new TextRenderable(renderer, {
    content: "",
    fg: theme.fg,
    wrapMode: "word",
    flexGrow: 1,
  });

  box.add(text);

  return [box, text];
};

const shell = new BoxRenderable(renderer, {
  flexGrow: 1,
  flexDirection: "column",
  backgroundColor: theme.bg,
});

const header = new BoxRenderable(renderer, {
  height: 3,
  backgroundColor: theme.header,
  border: true,
  borderColor: theme.border,
  justifyContent: "center",
  alignItems: "center",
});

const headerText = new TextRenderable(renderer, {
  content: `AUDIRE ARCANUS    http://${host}:5551`,
  fg: theme.blue,
});

header.add(headerText);

const top = new BoxRenderable(renderer, {
  flexGrow: 2,
  flexDirection: "row",
  backgroundColor: theme.bg,
});

const bottom = new BoxRenderable(renderer, {
  flexGrow: 3,
  flexDirection: "row",
  backgroundColor: theme.bg,
});

const [sourcesBox, sourcesText] = panel("Sources", 1);

const [lobbiesBox, lobbiesText] = panel("Lobbies", 1);

const [statsBox, statsText] = panel("Stream Stats", 1);

const [listenersBox, listenersText] = panel("Listeners", 2);

const [logBox, logText] = panel("Event Log", 1);

top.add(sourcesBox);

top.add(lobbiesBox);

top.add(statsBox);

bottom.add(listenersBox);

bottom.add(logBox);

const footer = new BoxRenderable(renderer, {
  height: 3,
  backgroundColor: theme.header,
  border: true,
  borderColor: theme.border,
  padding: 1,
});

const footerText = new TextRenderable(renderer, { content: "", fg: theme.yellow });

footer.add(footerText);

shell.add(header);

shell.add(top);

shell.add(bottom);

shell.add(footer);

renderer.root.add(shell);

const boxes = {
  sources: sourcesBox,
  lobbies: lobbiesBox,
  listeners: listenersBox,
};

let session: Session = initialSession();

let lobbies: Array<LobbyRow> = [];

let sources: Array<SourceRow> = [];

let listeners: Array<ListenerRow> = [];

let stats: StatsRow = { bytesOut: 0, framesOut: 0, listeners: 0, dropped: 0 };

let logLines: Array<string> = ["host up"];

let lastFault: string | undefined;

const note = (line: string) => {
  logLines = [...logLines, line];
};

const paint = () => {
  for (const pane of ["sources", "lobbies", "listeners"] as const) {
    boxes[pane].borderColor = session.focus === pane ? theme.focus : theme.border;
  }

  sourcesBox.title = `Sources ${String(sources.length)}`;

  lobbiesBox.title = `Lobbies ${String(lobbies.length)}`;

  listenersBox.title = `Listeners ${String(listeners.length)}`;

  sourcesText.content = formatList(
    sources.map(formatSourceLine),
    session.selectedSource,
    "No sources.",
  );

  lobbiesText.content =
    lobbies.length === 0
      ? "No lobbies created"
      : lobbies
          .map((lobby, index) => formatLobbyLine(lobby, index === session.selected))
          .join("\n");

  listenersText.content = formatList(
    listeners.map((row) => row.username),
    session.selectedListener,
    "No listeners connected",
  );

  const live = lobbies[session.selected]?.isStreaming === true;

  statsText.content = formatStats(stats, live);

  logText.content = formatLog(logLines);

  footerText.content =
    session.prompt === undefined
      ? formatHelp(session.focus, undefined)
      : formatPrompt(session.prompt.kind, session.prompt.buffer);

  footerText.fg = session.prompt === undefined ? theme.dim : theme.yellow;
};

const clamp = () => {
  if (session.selected >= lobbies.length) {
    session = { ...session, selected: Math.max(0, lobbies.length - 1) };
  }

  if (session.selectedSource >= sources.length) {
    session = { ...session, selectedSource: Math.max(0, sources.length - 1) };
  }

  if (session.selectedListener >= listeners.length) {
    session = { ...session, selectedListener: Math.max(0, listeners.length - 1) };
  }
};

const refresh = async () => {
  const lobbyText = await readText("/api/lobbies");

  const sourceText = await readText("/api/sources");

  const statsTextBody = await readText("/api/stats");

  // SAFETY: lobby/source/stats JSON matches the host row types.
  lobbies = JSON.parse(lobbyText) as Array<LobbyRow>;

  // SAFETY: GET /api/sources returns SourceRow tagged list.
  sources = JSON.parse(sourceText) as Array<SourceRow>;

  // SAFETY: GET /api/stats returns hub counters.
  stats = JSON.parse(statsTextBody) as StatsRow;

  const lobby = lobbies[session.selected];

  if (lobby === undefined) {
    listeners = [];
  } else {
    const peopleText = await readText(`/api/lobbies/${lobby.id}/listeners`);

    // SAFETY: GET /api/lobbies/:id/listeners returns username rows.
    listeners = JSON.parse(peopleText) as Array<ListenerRow>;
  }

  const statusText = await readText("/api/capture/status");

  // SAFETY: capture status is { error: { tag, message } | null }.
  const status = JSON.parse(statusText) as { error: { tag: string; message: string } | null };

  const fault = status.error === null ? undefined : `${status.error.tag}: ${status.error.message}`;

  if (fault !== undefined && fault !== lastFault) {
    note(fault);
  }

  lastFault = fault;

  clamp();

  paint();
};

const runCmd = async (action: Action): Promise<void> => {
  const lobby = lobbies[session.selected];

  const source = sources[session.selectedSource];

  if (lobby === undefined) {
    return;
  }

  if (action === "start") {
    if (source === undefined || !canStream(source)) {
      return;
    }

    await postText(
      "/api/stream/start",
      "POST",
      JSON.stringify({
        lobbyId: lobby.id,
        source: streamSourceBody(source),
      }),
    );

    note(`start ${lobby.name}`);

    return;
  }

  if (action === "stop") {
    await postText("/api/stream/stop", "POST", JSON.stringify({ lobbyId: lobby.id }));

    note(`stop ${lobby.name}`);

    return;
  }

  if (action === "close") {
    await fetch(`${base}/api/lobbies/${lobby.id}`, { method: "DELETE" });

    note(`close ${lobby.name}`);

    return;
  }

  if (action === "copy") {
    renderer.copyToClipboardOSC52(lobby.joinCode);

    note(`copied ${lobby.joinCode}`);

    return;
  }

  if (action === "kick") {
    const listener = listeners[session.selectedListener];

    if (listener === undefined) {
      return;
    }

    await postText(
      `/api/lobbies/${lobby.id}/kick`,
      "POST",
      JSON.stringify({ listenerId: listener.id }),
    );

    note(`kick ${listener.username}`);
  }
};

renderer.keyInput.on("keypress", (key) => {
  const [next, action, name] = reduceKey(
    session,
    { name: key.name, sequence: key.sequence },
    {
      lobbies: lobbies.length,
      sources: sources.length,
      listeners: listeners.length,
    },
  );

  session = next;

  if (action === "none") {
    paint();

    return;
  }

  if (action === "quit") {
    halt();

    return;
  }

  if (action === "create") {
    void postText("/api/lobbies", "POST", JSON.stringify({ name }))
      .then(() => {
        note(`created ${name}`);

        return refresh();
      })
      .then(() => {
        session = { ...session, selected: Math.max(0, lobbies.length - 1), focus: "lobbies" };

        paint();
      });

    return;
  }

  if (action === "rename") {
    const lobby = lobbies[session.selected];

    if (lobby === undefined) {
      paint();

      return;
    }

    void postText(`/api/lobbies/${lobby.id}`, "PATCH", JSON.stringify({ name })).then(() => {
      note(`rename ${name}`);

      return refresh();
    });

    return;
  }

  void runCmd(action).then(refresh);
});

await refresh();

setInterval(() => {
  void refresh();
}, 1000);
