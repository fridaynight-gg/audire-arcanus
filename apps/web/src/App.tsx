import { useEffect, useState } from "react";

type Lobby = {
  id: string;
  name: string;
  joinCode: string;
  listenerCount: number;
};

type Listener = {
  id: string;
  username: string;
};

export function App() {
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [listeners, setListeners] = useState<ReadonlyArray<Listener>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!lobby) {
      return;
    }
    const timer = setInterval(() => {
      void fetch(`/api/lobbies/${lobby.id}/listeners`)
        .then((res) => res.json())
        .then((data: ReadonlyArray<Listener>) => setListeners(data));
    }, 1000);
    return () => clearInterval(timer);
  }, [lobby]);

  const join = () => {
    void fetch("/api/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ joinCode, username }),
    }).then(async (res) => {
      const data = (await res.json()) as { lobby?: Lobby; error?: string };
      if (!res.ok || !data.lobby) {
        setError(data.error ?? "join failed");
        return;
      }
      setError("");
      setLobby(data.lobby);
    });
  };

  if (lobby) {
    return (
      <main>
        <h1>{lobby.name}</h1>
        <p>Code {lobby.joinCode}</p>
        <ul>
          {listeners.map((item) => (
            <li key={item.id}>{item.username}</li>
          ))}
        </ul>
      </main>
    );
  }

  return (
    <main>
      <h1>Audire Arcanus</h1>
      <p>Join a lobby with a 6-character code.</p>
      {error ? <p>{error}</p> : null}
      <label>
        Name
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          maxLength={32}
        />
      </label>
      <label>
        Join code
        <input
          value={joinCode}
          onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
          maxLength={6}
        />
      </label>
      <button type="button" onClick={join}>
        Join
      </button>
    </main>
  );
}
