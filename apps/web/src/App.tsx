import { useEffect, useState } from "react";
import { startPlayback, type PlayerState } from "./player.ts";

type Listener = {
  id: string;
  username: string;
};

export function App() {
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [lobbyName, setLobbyName] = useState("");
  const [lobbyId, setLobbyId] = useState("");
  const [code, setCode] = useState("");
  const [listeners, setListeners] = useState<ReadonlyArray<Listener>>([]);
  const [error, setError] = useState("");
  const [player, setPlayer] = useState<PlayerState>("idle");

  useEffect(() => {
    if (!lobbyId) {
      return;
    }
    const load = () => {
      void fetch(`/api/lobbies/${lobbyId}/listeners`)
        .then((res) => res.json())
        .then((data: ReadonlyArray<Listener>) => setListeners(data));
    };
    load();
    const timer = setInterval(load, 1000);
    return () => clearInterval(timer);
  }, [lobbyId]);

  const join = () => {
    void startPlayback(
      joinCode,
      username,
      (state) => setPlayer(state),
      (name, shownCode, id) => {
        setError("");
        setLobbyName(name);
        setCode(shownCode);
        setLobbyId(id);
      },
    ).catch((cause: unknown) => {
      setError(String(cause));
    });
  };

  if (lobbyId) {
    return (
      <main>
        <h1>{lobbyName}</h1>
        <p>Code {code}</p>
        <p data-testid="player-state">{player}</p>
        <ul aria-label="listeners">
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
