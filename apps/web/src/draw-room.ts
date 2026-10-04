import { cols, rows, tile, tileKind } from "./tavern-map.ts";

const rect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) => {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
};

const plank = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
  const x = cx * tile;
  const y = cy * tile;
  const odd = (cx + cy) % 2 === 0;
  rect(ctx, x, y, tile, tile, odd ? "#6b4423" : "#5c3a1e");
  rect(ctx, x, y + tile - 2, tile, 2, "#3a2416");
  rect(ctx, x + 8, y, 1, tile, "#4a2e16");
};

const wall = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
  const x = cx * tile;
  const y = cy * tile;
  rect(ctx, x, y, tile, tile, "#3a2416");
  rect(ctx, x, y, tile, 4, "#5c3317");
  rect(ctx, x + 2, y + 8, 6, 6, "#2a1810");
  rect(ctx, x + 18, y + 18, 8, 6, "#2a1810");
};

const bar = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
  const x = cx * tile;
  const y = cy * tile;
  rect(ctx, x, y, tile, tile, "#2a1810");
  rect(ctx, x, y, tile, 6, "#5c3317");
  rect(ctx, x + 10, y - 8, 4, 10, cx % 3 === 0 ? "#6b1d2a" : "#3d5c3a");
  rect(ctx, x + 20, y - 6, 3, 8, "#c9a227");
};

const table = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
  const x = cx * tile;
  const y = cy * tile;
  rect(ctx, x + 2, y + 4, tile - 4, tile - 8, "#8b5a2b");
  rect(ctx, x + 4, y + 6, tile - 8, 4, "#c4a06a");
  rect(ctx, x + 6, y + tile - 6, 4, 6, "#3a2416");
  rect(ctx, x + tile - 10, y + tile - 6, 4, 6, "#3a2416");
};

const barrel = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
  const x = cx * tile + 6;
  const y = cy * tile + 4;
  rect(ctx, x, y, 20, 24, "#8b5a2b");
  rect(ctx, x, y + 8, 20, 3, "#5c3317");
  rect(ctx, x, y + 16, 20, 3, "#5c3317");
  rect(ctx, x + 2, y + 2, 16, 4, "#c4a06a");
};

const rug = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
  const x = cx * tile;
  const y = cy * tile;
  rect(ctx, x, y, tile, tile, "#6b1d2a");
  rect(ctx, x + 4, y + 4, tile - 8, tile - 8, "#8b1e3f");
};

const lantern = (ctx: CanvasRenderingContext2D, px: number, py: number, glow: number) => {
  rect(ctx, px, py, 6, 8, "#c9a227");
  rect(ctx, px + 1, py + 2, 4, 4, glow > 0.5 ? "#f0c36a" : "#c45c26");
};

export const drawTavern = (ctx: CanvasRenderingContext2D, now: number) => {
  const width = cols * tile;
  const height = rows * tile;
  ctx.imageSmoothingEnabled = false;
  rect(ctx, 0, 0, width, height, "#1c120c");

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const kind = tileKind(cx, cy);

      if (kind === "wall") {
        wall(ctx, cx, cy);
      } else if (kind === "bar") {
        plank(ctx, cx, cy);
        bar(ctx, cx, cy);
      } else if (kind === "table") {
        plank(ctx, cx, cy);
        table(ctx, cx, cy);
      } else if (kind === "barrel") {
        plank(ctx, cx, cy);
        barrel(ctx, cx, cy);
      } else if (kind === "rug") {
        rug(ctx, cx, cy);
      } else {
        plank(ctx, cx, cy);
      }
    }
  }

  const pulse = (Math.sin(now / 180) + 1) / 2;
  rect(ctx, 11 * tile + 4, tile + 4, 2 * tile - 8, tile - 8, pulse > 0.45 ? "#c45c26" : "#8b1e3f");
  rect(ctx, 11 * tile + 12, tile + 8, 8, 8, "#f0c36a");

  lantern(ctx, 4 * tile + 12, 3 * tile + 4, pulse);
  lantern(ctx, 19 * tile + 12, 3 * tile + 4, 1 - pulse);
  lantern(ctx, 8 * tile + 12, 10 * tile, pulse);
  lantern(ctx, 16 * tile + 12, 10 * tile, 1 - pulse);

  rect(ctx, 7 * tile + 8, 6 * tile + 8, 10, 10, "#5c3317");
  rect(ctx, 11 * tile + 8, 9 * tile + 4, 10, 10, "#5c3317");
  rect(ctx, 13 * tile + 8, 6 * tile + 8, 10, 10, "#5c3317");
  rect(ctx, 17 * tile + 8, 9 * tile + 4, 10, 10, "#5c3317");
  rect(ctx, 5 * tile + 8, 10 * tile + 8, 10, 10, "#5c3317");
  rect(ctx, 9 * tile + 8, 13 * tile + 4, 10, 10, "#5c3317");

  rect(ctx, 11 * tile, height - tile, 2 * tile, 6, "#5c3317");
  rect(ctx, 11 * tile + 8, height - tile + 6, tile - 16, tile - 10, "#2a1810");
};
