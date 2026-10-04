export type Portrait = {
  readonly id: string;
  readonly label: string;
};

export const defaultAvatar = "wizard";

export const defaultPet = "none";

export const portraits: ReadonlyArray<Portrait> = [
  { id: "wizard", label: "Wizard" },
  { id: "ranger", label: "Ranger" },
  { id: "bard", label: "Bard" },
  { id: "rogue", label: "Rogue" },
  { id: "cleric", label: "Cleric" },
  { id: "paladin", label: "Paladin" },
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

  return portraits[0] ?? { id: defaultAvatar, label: "Wizard" };
};

export const petOf = (id: string): Portrait => {
  for (const item of pets) {
    if (item.id === id) {
      return item;
    }
  }

  return pets[0] ?? { id: defaultPet, label: "None" };
};
