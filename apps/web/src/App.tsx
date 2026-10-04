import { useEffect, useState } from "react";
import { startPlayback, type PlayerState } from "./player.ts";
import { defaultAvatar, defaultPet, petOf, pets, portraitOf, portraits } from "./portraits.ts";
import { Familiar, Sprite } from "./sprites.tsx";

type Listener = {
  id: string;
  username: string;
  avatar?: string;
  pet?: string;
};

const fieldClass =
  "mt-1 w-full border-2 border-oak bg-[#f3e6c8] px-3 py-2 font-pixel text-ink outline-none focus:border-ember";

const pickClass = (on: boolean) =>
  `flex cursor-pointer flex-col items-center gap-1 border-2 px-2 py-2 text-xs ${
    on ? "border-ember bg-[#f3e6c8]" : "border-oak/40 bg-[#f3e6c8]/50"
  }`;

export function App() {
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [avatar, setAvatar] = useState(defaultAvatar);
  const [pet, setPet] = useState(defaultPet);
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
      avatar,
      pet,
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
      <main className="relative min-h-dvh overflow-hidden bg-floor font-pixel text-parchment">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#5c331766,_transparent_55%)]"
          aria-hidden="true"
        />
        <header className="relative mx-auto mt-6 w-[min(36rem,92vw)] border-4 border-beam bg-oak px-6 py-4 text-center shadow-[8px_8px_0_#120b08]">
          <p className="font-display text-[0.7rem] tracking-[0.35em] text-candle uppercase">
            A table at
          </p>
          <h1 className="font-display text-3xl text-glow">{lobbyName}</h1>
          <p className="mt-1 text-candle">Code {code}</p>
        </header>
        <section
          className="relative mx-auto mt-10 w-[min(56rem,94vw)] border-4 border-beam bg-beam/80 p-6"
          aria-label="the common room"
        >
          <div
            className="mx-auto mb-6 h-16 w-24 bg-ember shadow-[0_0_40px_#f0c36a] motion-safe:animate-pulse"
            aria-hidden="true"
          />
          <div className="mx-auto mb-8 h-4 w-2/3 rounded-full bg-oak" aria-hidden="true" />
          <ul aria-label="listeners" className="flex flex-wrap justify-center gap-6">
            {listeners.map((item) => {
              const face = portraitOf(item.avatar ?? defaultAvatar);
              const companion = petOf(item.pet ?? defaultPet);

              return (
                <li
                  key={item.id}
                  className="flex w-24 flex-col items-center gap-1 border-2 border-candle/20 bg-soot/50 p-2"
                >
                  <Sprite id={face.id} />
                  {companion.id === "none" ? null : <Familiar id={companion.id} />}
                  <span className="max-w-full truncate text-center text-xs text-glow">
                    {item.username}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <p
          data-testid="player-state"
          className={`relative mt-8 text-center font-display tracking-[0.2em] uppercase ${
            player === "live" ? "text-candle" : "text-oak"
          }`}
        >
          {player}
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-soot bg-[radial-gradient(circle_at_top,_#5c3317_0%,_#120b08_55%)] p-4 font-pixel text-ink">
      <div className="w-full max-w-lg border-4 border-oak bg-parchment p-8 shadow-[12px_12px_0_#120b08]">
        <p className="font-display text-center text-[0.7rem] tracking-[0.4em] text-ember uppercase">
          Lanterns are lit
        </p>
        <h1 className="mt-2 text-center font-display text-4xl text-wine">Audire Arcanus</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-oak">
          Join a lobby with a 6-character code. The dungeon master is already speaking.
        </p>
        {error ? <p className="mt-3 text-center text-wine">{error}</p> : null}
        <label className="mt-6 block text-xs tracking-widest uppercase">
          Name
          <input
            className={fieldClass}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            maxLength={32}
            autoComplete="nickname"
          />
        </label>
        <label className="mt-4 block text-xs tracking-widest uppercase">
          Join code
          <input
            className={`${fieldClass} tracking-[0.4em]`}
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            maxLength={6}
            spellCheck={false}
          />
        </label>
        <fieldset className="mt-6">
          <legend className="text-xs tracking-widest uppercase">Visage</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {portraits.map((item) => (
              <label key={item.id} className={pickClass(avatar === item.id)}>
                <input
                  className="sr-only"
                  type="radio"
                  name="avatar"
                  value={item.id}
                  checked={avatar === item.id}
                  onChange={() => setAvatar(item.id)}
                />
                <Sprite id={item.id} />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-6">
          <legend className="text-xs tracking-widest uppercase">Companion</legend>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {pets.map((item) => (
              <label key={item.id} className={pickClass(pet === item.id)}>
                <input
                  className="sr-only"
                  type="radio"
                  name="pet"
                  value={item.id}
                  checked={pet === item.id}
                  onChange={() => setPet(item.id)}
                />
                <Familiar id={item.id} />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          className="mt-8 w-full border-2 border-soot bg-ember px-4 py-3 font-display text-lg tracking-[0.2em] text-parchment uppercase shadow-[4px_4px_0_#120b08] hover:bg-wine"
          onClick={join}
        >
          Join
        </button>
      </div>
    </main>
  );
}
