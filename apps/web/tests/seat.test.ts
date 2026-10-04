import { describe, expect, it } from "@effect/vitest";
import { clearSeat, readSeat, writeSeat } from "../src/seat.ts";

const memory = () => {
  const bag = new Map<string, string>();

  return {
    getItem: (key: string) => bag.get(key) ?? null,
    setItem: (key: string, value: string) => {
      bag.set(key, value);
    },
    removeItem: (key: string) => {
      bag.delete(key);
    },
  };
};

describe("seat", () => {
  it("roundtrips a session and clears it", () => {
    const store = memory();
    expect(readSeat(store)).toBeUndefined();
    writeSeat(store, {
      username: "alice",
      joinCode: "KNASYK",
      avatar: "wizard",
      pet: "cat",
    });
    expect(readSeat(store)).toEqual({
      username: "alice",
      joinCode: "KNASYK",
      avatar: "wizard",
      pet: "cat",
    });
    clearSeat(store);
    expect(readSeat(store)).toBeUndefined();
  });

  it("ignores junk", () => {
    const store = memory();
    store.setItem("audire-seat", "{");
    expect(readSeat(store)).toBeUndefined();
  });
});
