export type Portrait = {
  readonly id: string;
  readonly label: string;
};

export const defaultAvatar = "wizard";

export const defaultPet = "none";

export const portraits: ReadonlyArray<Portrait> = [
  { id: "barbarian", label: "Barbarian" },
  { id: "bard", label: "Bard" },
  { id: "cleric", label: "Cleric" },
  { id: "druid", label: "Druid" },
  { id: "fighter", label: "Fighter" },
  { id: "monk", label: "Monk" },
  { id: "paladin", label: "Paladin" },
  { id: "ranger", label: "Ranger" },
  { id: "rogue", label: "Rogue" },
  { id: "sorcerer", label: "Sorcerer" },
  { id: "warlock", label: "Warlock" },
  { id: "wizard", label: "Wizard" },
];

export const pets: ReadonlyArray<Portrait> = [
  { id: "none", label: "None" },
  { id: "cat", label: "Cat" },
  { id: "raven", label: "Raven" },
  { id: "fox", label: "Fox" },
  { id: "owl", label: "Owl" },
];

export const portraitOf = (id: string): Portrait => {
  for (const item of portraits) {
    if (item.id === id) {
      return item;
    }
  }

  return portraits[11] ?? { id: defaultAvatar, label: "Wizard" };
};

export const petOf = (id: string): Portrait => {
  for (const item of pets) {
    if (item.id === id) {
      return item;
    }
  }

  return pets[0] ?? { id: defaultPet, label: "None" };
};
