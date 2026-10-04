export const tile = 32;

export const cols = 24;

export const rows = 18;

export const spawnX = 12 * tile;

export const spawnY = 14 * tile;

const blocked = new Set<string>();

const mark = (cx: number, cy: number) => {
  blocked.add(`${String(cx)},${String(cy)}`);
};

for (let x = 0; x < cols; x++) {
  mark(x, 0);
  mark(x, rows - 1);
}

for (let y = 0; y < rows; y++) {
  mark(0, y);
  mark(cols - 1, y);
}

for (let x = 3; x <= 20; x++) {
  mark(x, 2);
}

for (let x = 8; x <= 10; x++) {
  mark(x, 7);
  mark(x, 8);
}

for (let x = 14; x <= 16; x++) {
  mark(x, 7);
  mark(x, 8);
}

for (let x = 6; x <= 8; x++) {
  mark(x, 11);
  mark(x, 12);
}

export const tavernBlocked = (x: number, y: number): boolean => {
  const cx = Math.floor(x / tile);
  const cy = Math.floor(y / tile);

  if (cx <= 0 || cy <= 0 || cx >= cols - 1 || cy >= rows - 1) {
    return true;
  }

  return blocked.has(`${String(cx)},${String(cy)}`);
};

const radius = 10;

const hits = (x: number, y: number): boolean =>
  tavernBlocked(x, y) ||
  tavernBlocked(x - radius, y) ||
  tavernBlocked(x + radius, y) ||
  tavernBlocked(x, y - radius) ||
  tavernBlocked(x, y + radius);

export const moveBody = (x: number, y: number, dx: number, dy: number) => {
  let nx = x;
  let ny = y;

  if (!hits(x + dx, y)) {
    nx = x + dx;
  }

  if (!hits(nx, y + dy)) {
    ny = y + dy;
  }

  return { x: nx, y: ny };
};
