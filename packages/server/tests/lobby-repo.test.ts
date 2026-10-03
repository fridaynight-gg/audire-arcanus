import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { LobbyRepo } from "../src/lobby-repo.ts";

describe("LobbyRepo", () => {
  it.effect("creates and lists a lobby", () =>
    Effect.gen(function* () {
      const repo = yield* LobbyRepo;
      const lobby = yield* repo.create("alpha");
      expect(lobby.name).toBe("alpha");
      expect(lobby.joinCode).toHaveLength(6);
      const listed = yield* repo.list;
      expect(listed.length).toBe(1);
    }).pipe(Effect.provide(LobbyRepo.layer)),
  );

  it.effect("joins by code and lists listeners", () =>
    Effect.gen(function* () {
      const repo = yield* LobbyRepo;
      const lobby = yield* repo.create("beta");
      const found = yield* repo.byCode(lobby.joinCode);
      expect(found.id).toBe(lobby.id);
      const listener = yield* repo.addListener(lobby.id, "nebula");
      const people = yield* repo.listenersFor(lobby.id);
      expect(people.map((item) => item.username)).toEqual(["nebula"]);
      yield* repo.removeListener(listener.id);
      const after = yield* repo.listenersFor(lobby.id);
      expect(after.length).toBe(0);
    }).pipe(Effect.provide(LobbyRepo.layer)),
  );
});
