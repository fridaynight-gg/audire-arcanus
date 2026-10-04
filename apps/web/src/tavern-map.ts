export const tile = 32;

export const cols = 24;

export const rows = 18;

export const spawnX = 12 * tile;

export const spawnY = 14 * tile;

export type TileKind = "floor" | "wall" | "bar" | "table" | "barrel" | "hearth" | "rug";

const grid: Array<Array<TileKind>> = [];

for (let y = 0; y < rows; y++) {
  const row: Array<TileKind> = [];

  for (let x = 0; x < cols; x++) {
    row.push("floor");
  }

  grid.push(row);
}

const set = (cx: number, cy: number, kind: TileKind) => {
  const row = grid[cy];

  if (row === undefined) {
    return;
  }

  if (cx < 0 || cx >= cols) {
    return;
  }

  row[cx] = kind;
};

for (let x = 0; x < cols; x++) {
  set(x, 0, "wall");
  set(x, 1, "wall");
  set(x, rows - 1, "wall");
}

for (let y = 0; y < rows; y++) {
  set(0, y, "wall");
  set(cols - 1, y, "wall");
}

for (let x = 2; x <= 21; x++) {
  set(x, 2, "bar");
}

for (let x = 8; x <= 10; x++) {
  set(x, 7, "table");
  set(x, 8, "table");
}

for (let x = 14; x <= 16; x++) {
  set(x, 7, "table");
  set(x, 8, "table");
}

for (let x = 6; x <= 8; x++) {
  set(x, 11, "table");
  set(x, 12, "table");
}

set(2, 5, "barrel");
set(2, 6, "barrel");
set(21, 5, "barrel");
set(21, 9, "barrel");
set(3, 15, "barrel");
set(20, 15, "barrel");

for (let x = 10; x <= 13; x++) {
  for (let y = 13; y <= 15; y++) {
    set(x, y, "rug");
  }
}

set(11, 14, "floor");
set(12, 14, "floor");

const solid = (kind: TileKind): boolean =>
  kind === "wall" || kind === "bar" || kind === "table" || kind === "barrel" || kind === "hearth";

export const tileKind = (cx: number, cy: number): TileKind => {
  if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) {
    return "wall";
  }

  return grid[cy]?.[cx] ?? "wall";
};

export const tavernBlocked = (x: number, y: number): boolean => {
  const cx = Math.floor(x / tile);
  const cy = Math.floor(y / tile);

  return solid(tileKind(cx, cy));
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

export const atDoor = (x: number, y: number): boolean => {
  const cx = Math.floor(x / tile);
  const cy = Math.floor(y / tile);

  return cy >= rows - 1 && (cx === 11 || cx === 12);
};
