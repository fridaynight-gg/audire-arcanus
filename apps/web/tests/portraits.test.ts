import { describe, expect, it } from "@effect/vitest";
import { defaultAvatar, defaultPet, portraitOf, portraits, petOf, pets } from "../src/portraits.ts";

describe("portraits", () => {
  it("lists the default visages and companions", () => {
    expect(portraits.map((item) => item.id)).toEqual([
      "wizard",
      "ranger",
      "bard",
      "rogue",
      "cleric",
      "paladin",
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
