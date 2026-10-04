export const rollDie = (sides: number, rand: () => number): number => {
  const n = Math.max(1, Math.floor(sides));
  const unit = Math.min(Math.max(rand(), 0), 0.999999);

  return 1 + Math.floor(unit * n);
};
