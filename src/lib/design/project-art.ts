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

export type LiveStage = DesignStage | "sent";

const LIVE_STAGES = new Set<string>([
  "sketch",
  "shape",
  "build",
  "sent",
  "arrived",
]);

export function isLiveStage(v: string): v is LiveStage {
  return LIVE_STAGES.has(v);
}

// A stored stage (set by advancing / sending off / arriving) wins; otherwise
// the stage is derived from the version number.
export function effectiveStage(
  stored: string | null,
  version: number,
): LiveStage {
  if (stored && isLiveStage(stored)) return stored;
  return stageForVersion(version);
}

export function nextStage(stage: LiveStage): LiveStage | null {
  if (stage === "sketch") return "shape";
  if (stage === "shape") return "build";
  return null;
}

// Port of arrivalLine + the arrival head from the design prototype.
export function arrivalHead(medium: DesignMedium): string {
  return (
    {
      hardware: "It's here!",
      software: "It's installed!",
      print: "Delivered!",
      space: "All done!",
      music: "Released!",
      dance: "Showtime!",
      recipe: "On the menu!",
    } as Record<DesignMedium, string>
  )[medium];
}

export function arrivalLine(
  workshopType: string,
  workshopName: string,
  projectName: string,
  medium: DesignMedium,
  target?: string,
): string {
  const where =
    workshopType === "studio"
      ? "on the studio floor"
      : workshopType === "garage"
        ? "on the workbench"
        : "on the counter";
  switch (medium) {
    case "software":
      return `${projectName} is installed and running. It's on the ${target || "tablet"} in ${workshopName}. What should we make next?`;
    case "print":
      return `${projectName} just came back from the printer — I hung it up in ${workshopName}. What's next?`;
    case "space":
      return `The new layout for ${workshopName} is done. Want to plan the next thing?`;
    case "music":
      return `${projectName} is mixed and released. Want to start another?`;
    case "dance":
      return `${projectName} is ready for the stage. What's next in ${workshopName}?`;
    case "recipe":
      return `${projectName} is on the menu at ${workshopName}. What should we cook up next?`;
    default:
      return `Your ${projectName} has arrived! I unpacked it and set it up ${where} in ${workshopName}. Ready for the next project?`;
  }
}

// Lines for a print board's menu: the most name-like text values in the data.
export function menuLines(
  collections: { id: string; fields: { id: string; type: string }[] }[],
  records: Record<string, { data: unknown }[]>,
  max = 4,
): string[] {
  const cell = (r: { data: unknown }, field: string): string => {
    const d =
      typeof r.data === "object" && r.data !== null
        ? (r.data as Record<string, unknown>)
        : null;
    return String(d?.[field] ?? "").trim();
  };
  for (const want of ["name", "title", "item"]) {
    for (const c of collections) {
      const f = c.fields.find((x) => x.id === want && x.type === "text");
      if (!f) continue;
      const lines = (records[c.id] ?? [])
        .map((r) => cell(r, f.id))
        .filter(Boolean)
        .slice(0, max);
      if (lines.length > 0) return lines;
    }
  }
  const first = collections[0];
  const f = first?.fields.find((x) => x.type === "text");
  if (!first || !f) return [];
  return (records[first.id] ?? [])
    .map((r) => cell(r, f.id))
    .filter(Boolean)
    .slice(0, max);
}

export function mediumForKind(kind: string): DesignMedium {
  return isMediumId(kind) ? kind : "software";
}

// What the apprentice asks about each kind, ported from B.MEDIUMS.
export const MEDIUM_QUESTIONS: Record<DesignMedium, string[]> = {
  hardware: [
    "Where does it live — what does it sit on, and how much room is there?",
    "What has to plug into it: power, water, air, anything else?",
    "Is there anything you already own that it has to fit?",
    "How many do you need — just one, or a small run?",
    "What would make you say it's better than what you have now?",
  ],
  software: [
    "Who uses it first — you, your staff, or customers?",
    "What will it run on: a phone, a tablet, a computer, or the web?",
    "What's the one thing it must do on day one?",
    "Does it need to talk to anything you already use, like a till or a calendar?",
    "What should it never do — anything that would annoy people?",
  ],
  music: [
    "What should it feel like in the first ten seconds?",
    "Roughly how fast — slow dance, walking pace, or running?",
    "Is there a line or phrase that has to be in it?",
    "Who sings or plays it?",
  ],
  dance: [
    "How many dancers, and what level?",
    "What's the music, or should I suggest some?",
    "How long is the piece?",
    "Is there a moment you already see in your head?",
  ],
  print: [
    "Where will it hang or be handed out?",
    "What's the one thing people should read first?",
    "How big, and how many copies?",
    "Any colors or fonts it has to match?",
  ],
  recipe: [
    "How many portions at a time?",
    "What should it cost you per serving, at most?",
    "Any allergens to avoid?",
    "Is it for every day or a special?",
  ],
  space: [
    "How big is the room, roughly?",
    "How many people at the busiest moment?",
    "What can't move — plumbing, doors, windows?",
    "What's your budget range?",
  ],
};

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
