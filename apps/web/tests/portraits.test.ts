import { describe, expect, it } from "@effect/vitest";
import { defaultAvatar, defaultPet, portraitOf, portraits, petOf, pets } from "../src/portraits.ts";
import { moveBody, tavernBlocked, tileKind } from "../src/tavern-map.ts";
import { rollDie } from "../src/dice.ts";

describe("portraits", () => {
  it("lists the twelve visages and companions", () => {
    expect(portraits.map((item) => item.id)).toEqual([
      "barbarian",
      "bard",
      "cleric",
      "druid",
      "fighter",
      "monk",
      "paladin",
      "ranger",
      "rogue",
      "sorcerer",
      "warlock",
      "wizard",
    ]);
    expect(pets.map((item) => item.id)).toEqual(["none", "cat", "raven", "fox", "owl"]);
    expect(defaultAvatar).toBe("wizard");
    expect(defaultPet).toBe("none");
  });

  it("falls back to the default visage and empty companion", () => {
    expect(portraitOf("missing").id).toBe(defaultAvatar);
    expect(petOf("missing").id).toBe(defaultPet);
    expect(petOf("none").label).toBe("None");
  });
});

describe("tileKind", () => {
  it("labels floor, wall, bar, and tables", () => {
    expect(tileKind(12, 14)).toBe("floor");
    expect(tileKind(0, 0)).toBe("wall");
    expect(tileKind(12, 2)).toBe("bar");
    expect(tileKind(9, 7)).toBe("table");
  });
});

describe("tavernBlocked", () => {
  it("blocks the outer walls and leaves the spawn open", () => {
    expect(tavernBlocked(0, 0)).toBe(true);
    expect(tavernBlocked(16, 16)).toBe(true);
    expect(tavernBlocked(320, 400)).toBe(false);
  });
});

describe("moveBody", () => {
  it("stops against a wall", () => {
    const next = moveBody(48, 48, -40, 0);
    expect(next.x).toBeGreaterThan(16);
  });
});

describe("rollDie", () => {
  it("maps unit random onto 1..sides", () => {
    expect(rollDie(20, () => 0)).toBe(1);
    expect(rollDie(20, () => 0.999)).toBe(20);
  });
});
