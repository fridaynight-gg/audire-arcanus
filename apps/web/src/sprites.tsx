const visages = {
  wizard: { hat: "#6b3fa0", robe: "#3d2a6b", skin: "#e8c4a0", trim: "#c9a227" },
  ranger: { hat: "#3d5c3a", robe: "#2f4a2c", skin: "#d4a574", trim: "#8b5a2b" },
  bard: { hat: "#8b1e3f", robe: "#c45c26", skin: "#e8c4a0", trim: "#f0c36a" },
  rogue: { hat: "#2a1810", robe: "#3a2416", skin: "#c48a6a", trim: "#6b1d2a" },
  cleric: { hat: "#efe6c9", robe: "#d8c49a", skin: "#e8c4a0", trim: "#c9a227" },
  paladin: { hat: "#6a7a8a", robe: "#3d4f6b", skin: "#e8c4a0", trim: "#c9a227" },
};

const companions = {
  cat: "#c45c26",
  raven: "#2a1810",
  fox: "#c45c26",
  owl: "#d8c49a",
};

const visageOf = (id: string) => {
  for (const key of ["wizard", "ranger", "bard", "rogue", "cleric", "paladin"] as const) {
    if (key === id) {
      return visages[key];
    }
  }

  return visages.wizard;
};

const companionFill = (id: string) => {
  for (const key of ["cat", "raven", "fox", "owl"] as const) {
    if (key === id) {
      return companions[key];
    }
  }

  return companions.cat;
};

export function Sprite({ id }: { readonly id: string }) {
  const face = visageOf(id);

  return (
    <svg
      viewBox="0 0 16 20"
      className="h-16 w-12 shrink-0 [image-rendering:pixelated]"
      aria-hidden="true"
    >
      <rect x="5" y="0" width="6" height="3" fill={face.hat} />
      <rect x="4" y="3" width="8" height="2" fill={face.hat} />
      <rect x="5" y="5" width="6" height="5" fill={face.skin} />
      <rect x="6" y="7" width="1" height="1" fill="#1c120c" />
      <rect x="9" y="7" width="1" height="1" fill="#1c120c" />
      <rect x="4" y="10" width="8" height="8" fill={face.robe} />
      <rect x="4" y="10" width="8" height="1" fill={face.trim} />
      <rect x="3" y="18" width="4" height="2" fill="#2a1810" />
      <rect x="9" y="18" width="4" height="2" fill="#2a1810" />
    </svg>
  );
}

export function Familiar({ id }: { readonly id: string }) {
  if (id === "none") {
    return <span className="block h-6 w-6" />;
  }

  const fill = companionFill(id);

  return (
    <svg
      viewBox="0 0 8 8"
      className="h-6 w-6 shrink-0 [image-rendering:pixelated]"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="4" height="3" fill={fill} />
      <rect x="1" y="4" width="2" height="2" fill={fill} />
      <rect x="5" y="2" width="2" height="2" fill={fill} />
      <rect x="3" y="4" width="1" height="1" fill="#1c120c" />
    </svg>
  );
}
