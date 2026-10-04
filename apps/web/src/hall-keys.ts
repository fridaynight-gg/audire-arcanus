export type HallKeyAction = "ignore" | "focus-say" | "roll" | "walk";

export const routeHallKey = (key: string, targetIsInput: boolean): HallKeyAction => {
  if (targetIsInput) {
    return "ignore";
  }

  if (key === "Enter") {
    return "focus-say";
  }

  if (key === "r" || key === "R") {
    return "roll";
  }

  return "walk";
};
