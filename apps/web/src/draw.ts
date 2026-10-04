export type Dir = "down" | "left" | "right" | "up";

export type Anim = "idle" | "walk";

type Swatch = {
  readonly hair: string;
  readonly skin: string;
  readonly cloth: string;
  readonly accent: string;
  readonly boot: string;
};

const looks = {
  barbarian: {
    hair: "#6b3a18",
    skin: "#e0a070",
    cloth: "#7a2e12",
    accent: "#c0c4c8",
    boot: "#3a2416",
  },
  bard: { hair: "#5c3317", skin: "#e8c4a0", cloth: "#c45c26", accent: "#f0c36a", boot: "#3a2416" },
  cleric: {
    hair: "#efe6c9",
    skin: "#e8c4a0",
    cloth: "#d8c49a",
    accent: "#6b8cce",
    boot: "#5c3317",
  },
  druid: { hair: "#3d5c3a", skin: "#d4a574", cloth: "#2f4a2c", accent: "#8b5a2b", boot: "#2a1810" },
  fighter: {
    hair: "#3a2416",
    skin: "#e8c4a0",
    cloth: "#6a7a8a",
    accent: "#c0c4c8",
    boot: "#2a1810",
  },
  monk: { hair: "#2a1810", skin: "#d4a574", cloth: "#c4a06a", accent: "#efe6c9", boot: "#5c3317" },
  paladin: {
    hair: "#c9a227",
    skin: "#e8c4a0",
    cloth: "#c9a227",
    accent: "#6b1d2a",
    boot: "#3a2416",
  },
  ranger: {
    hair: "#cfc6a8",
    skin: "#e8c4a0",
    cloth: "#3d5c3a",
    accent: "#8b5a2b",
    boot: "#2a1810",
  },
  rogue: { hair: "#6b1d2a", skin: "#e8c4a0", cloth: "#2a1810", accent: "#c0c4c8", boot: "#1c120c" },
  sorcerer: {
    hair: "#d8d0d4",
    skin: "#e8c4a0",
    cloth: "#6b1d2a",
    accent: "#c9a227",
    boot: "#3a2416",
  },
  warlock: {
    hair: "#2a1810",
    skin: "#c48a6a",
    cloth: "#4a2a6b",
    accent: "#6b3fa0",
    boot: "#1c120c",
  },
  wizard: {
    hair: "#2a3a6b",
    skin: "#e8c4a0",
    cloth: "#3d4f9b",
    accent: "#c9a227",
    boot: "#2a1810",
  },
};

const downIdle = [
  "................",
  "......hhhh......",
  ".....hhhhhh.....",
  ".....hssssh.....",
  ".....ssssss.....",
  "......s..s......",
  ".....cccccc.....",
  "....cccccccc....",
  "....cc.aa.cc....",
  "....cccccccc....",
  ".....bb..bb.....",
  ".....bb..bb.....",
];

const downWalk = [
  "................",
  "......hhhh......",
  ".....hhhhhh.....",
  ".....hssssh.....",
  ".....ssssss.....",
  "......s..s......",
  ".....cccccc.....",
  "....cccccccc....",
  "....cc.aa.cc....",
  "....cccccccc....",
  "....bb....bb....",
  "....bb....bb....",
];

const upIdle = [
  "................",
  "......hhhh......",
  ".....hhhhhh.....",
  ".....hhhhhh.....",
  ".....hhhhhh.....",
  "......hhhh......",
  ".....cccccc.....",
  "....cccccccc....",
  "....cccccccc....",
  "....cccccccc....",
  ".....bb..bb.....",
  ".....bb..bb.....",
];

const petGlyph = {
  cat: ["..ee..", ".eeee.", "e.ee.e", ".eeee.", "..bb.."],
  raven: ["..kk..", ".kkkk.", "kk.kkk", ".kkkk.", "..bb.."],
  fox: ["e....e", ".eeee.", "e.ee.e", ".eeee.", "..bb.."],
  owl: ["..cc..", ".cwwc.", "c.ww.c", ".cccc.", "..bb.."],
};

const tone = (ch: string, swatch: Swatch): string | undefined => {
  if (ch === "h") {
    return swatch.hair;
  }

  if (ch === "s") {
    return swatch.skin;
  }

  if (ch === "c") {
    return swatch.cloth;
  }

  if (ch === "a") {
    return swatch.accent;
  }

  if (ch === "b") {
    return swatch.boot;
  }

  if (ch === "e") {
    return "#c45c26";
  }

  if (ch === "k") {
    return "#1c120c";
  }

  if (ch === "w") {
    return "#efe6c9";
  }

  return undefined;
};

const lookOf = (id: string): Swatch => {
  if (id === "barbarian") {
    return looks.barbarian;
  }

  if (id === "bard") {
    return looks.bard;
  }

  if (id === "cleric") {
    return looks.cleric;
  }

  if (id === "druid") {
    return looks.druid;
  }

  if (id === "fighter") {
    return looks.fighter;
  }

  if (id === "monk") {
    return looks.monk;
  }

  if (id === "paladin") {
    return looks.paladin;
  }

  if (id === "ranger") {
    return looks.ranger;
  }

  if (id === "rogue") {
    return looks.rogue;
  }

  if (id === "sorcerer") {
    return looks.sorcerer;
  }

  if (id === "warlock") {
    return looks.warlock;
  }

  return looks.wizard;
};

const stamp = (
  ctx: CanvasRenderingContext2D,
  rows: ReadonlyArray<string>,
  originX: number,
  originY: number,
  pixel: number,
  swatch: Swatch,
  mirror: boolean,
) => {
  const width = rows[0]?.length ?? 0;

  for (let y = 0; y < rows.length; y++) {
    const line = rows[y] ?? "";

    for (let x = 0; x < line.length; x++) {
      const fill = tone(line[x] ?? ".", swatch);

      if (fill === undefined) {
        continue;
      }

      const px = mirror ? width - 1 - x : x;
      ctx.fillStyle = fill;
      ctx.fillRect(originX + px * pixel, originY + y * pixel, pixel, pixel);
    }
  }
};

export const drawPatron = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  id: string,
  dir: Dir,
  anim: Anim,
  frame: number,
) => {
  const swatch = lookOf(id);
  const walking = anim === "walk" && frame % 2 === 1;
  const rows = dir === "up" ? upIdle : walking ? downWalk : downIdle;
  const mirror = dir === "left";
  stamp(ctx, rows, Math.round(x) - 16, Math.round(y) - 24, 2, swatch, mirror);
};

export const drawFamiliar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  id: string,
  frame: number,
) => {
  if (id === "none") {
    return;
  }

  const bob = frame % 2 === 0 ? 0 : 1;
  const rows =
    id === "raven"
      ? petGlyph.raven
      : id === "fox"
        ? petGlyph.fox
        : id === "owl"
          ? petGlyph.owl
          : petGlyph.cat;
  stamp(ctx, rows, Math.round(x) - 6, Math.round(y) - 10 - bob, 2, looks.wizard, false);
};
