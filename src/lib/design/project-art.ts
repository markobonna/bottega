// Maps real backend state onto the design prototype's room/board vocabulary.
// Stage comes from the app's version number: versions only move forward one
// step at a time, which is exactly the design's stage rule. "sent" is skipped:
// nothing is ordered or shipped in this backend, so a project goes from being
// built straight to arrived (installed).

export type DesignStage = "sketch" | "shape" | "build" | "arrived";

export const MEDIUM_IDS = [
  "hardware",
  "software",
  "music",
  "dance",
  "print",
  "recipe",
  "space",
] as const;
export type DesignMedium = (typeof MEDIUM_IDS)[number];

const MEDIUM_SET = new Set<string>(MEDIUM_IDS);

export function isMediumId(v: string): v is DesignMedium {
  return MEDIUM_SET.has(v);
}

export function stageForVersion(version: number): DesignStage {
  if (version <= 1) return "sketch";
  if (version === 2) return "shape";
  if (version === 3) return "build";
  return "arrived";
}

export function mediumForKind(kind: string): DesignMedium {
  return isMediumId(kind) ? kind : "software";
}

// Keyword lists ported from the design prototype's B.MEDIUMS so the server
// can guess the medium the same way the prototype does.
// Client art uses its own copy; keep the lists in sync.
const MEDIUM_KEYWORDS: Record<DesignMedium, string[]> = {
  hardware: [
    "machine", "maker", "device", "register", "grinder", "rack", "lamp",
    "fix", "repair", "gadget", "hardware", "motor", "sensor", "cabinet",
    "table", "chair", "shelf", "stand", "holder", "tower", "brewer",
    "kettle", "oven", "cart", "bracket", "mount", "case", "enclosure",
    "collector", "pedalboard", "drawer", "kit", "robot", "printer",
  ],
  software: [
    "app", "website", "site", "software", "program", "system", "dashboard",
    "bot", "booking", "tracker", "portal", "page", "online", "ordering",
    "inventory", "quiz", "calculator", "spreadsheet", "automation",
  ],
  music: [
    "song", "music", "track", "melody", "beat", "playlist", "jingle",
    "tune", "lyrics", "score",
  ],
  dance: [
    "dance", "routine", "choreograph", "combo", "piece", "number",
    "showcase", "recital",
  ],
  print: [
    "menu", "sign", "poster", "flyer", "label", "logo", "card", "banner",
    "board", "worksheet", "brochure", "sticker", "signage",
  ],
  recipe: [
    "recipe", "drink", "dish", "latte", "cake", "sauce", "cocktail",
    "bread", "special", "pastry", "soup",
  ],
  space: [
    "layout", "floor plan", "seating", "redesign", "remodel", "space",
    "room layout", "renovation",
  ],
};

function keywordScore(text: string, words: string[]): number {
  let s = 0;
  for (const k of words) {
    const pat = k.replace(/ /g, "\\s+");
    if (new RegExp(`\\b${pat}s?\\b`).test(text)) s += k.length;
  }
  return s;
}

// Port of B.detectMedium: first-best wins ties (MEDIUM_IDS is in the
// prototype's B.MEDIUMS order). Falls back as given, default software.
export function detectMedium(
  text: string,
  fallback: DesignMedium = "software",
): DesignMedium {
  const t = ` ${text.toLowerCase()} `;
  let best: DesignMedium = fallback;
  let score = 0;
  for (const id of MEDIUM_IDS) {
    const s = keywordScore(t, MEDIUM_KEYWORDS[id]);
    if (s > score) {
      best = id;
      score = s;
    }
  }
  return best;
}
