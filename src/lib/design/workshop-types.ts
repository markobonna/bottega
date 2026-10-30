// Workshop type keywords, ported from the design prototype's
// B.WORKSHOP_TYPES so the server can type workshops by name.
// Client art uses its own copy; keep the keyword lists in sync.

export type WorkshopTypeId =
  | "cafe"
  | "garage"
  | "studio"
  | "store"
  | "kitchen"
  | "music"
  | "classroom"
  | "other";

const KEYWORDS: Record<Exclude<WorkshopTypeId, "other">, string[]> = {
  cafe: [
    "café",
    "cafe",
    "coffee",
    "espresso",
    "bakery",
    "tea room",
    "coffee shop",
    "barista",
  ],
  garage: [
    "garage",
    "shed",
    "workbench",
    "woodshop",
    "car",
    "bike",
    "maker space",
    "makerspace",
  ],
  studio: ["dance", "ballet", "studio", "yoga", "choreograph", "pilates"],
  store: [
    "store",
    "shop",
    "boutique",
    "market",
    "retail",
    "grocery",
    "corner store",
  ],
  kitchen: [
    "kitchen",
    "restaurant",
    "diner",
    "catering",
    "food truck",
    "bistro",
    "pizzeria",
  ],
  music: [
    "music room",
    "band",
    "recording",
    "rehearsal room",
    "home studio",
    "guitar",
    "piano",
  ],
  classroom: ["classroom", "school", "teach", "class", "tutoring", "lesson"],
};

export const WORKSHOP_TYPE_OPTIONS: { id: WorkshopTypeId; label: string }[] =
  [
    { id: "cafe", label: "Café" },
    { id: "garage", label: "Garage" },
    { id: "studio", label: "Studio" },
    { id: "store", label: "Shop" },
    { id: "kitchen", label: "Kitchen" },
    { id: "music", label: "Music room" },
    { id: "classroom", label: "Classroom" },
    { id: "other", label: "Other" },
  ];

const TYPE_IDS = new Set<string>(WORKSHOP_TYPE_OPTIONS.map((o) => o.id));

export function isWorkshopTypeId(v: string): v is WorkshopTypeId {
  return TYPE_IDS.has(v);
}

export function detectWorkshopType(name: string): WorkshopTypeId {
  const t = name.toLowerCase();
  let best: WorkshopTypeId = "other";
  let score = 0;
  for (const [id, words] of Object.entries(KEYWORDS) as [
    WorkshopTypeId,
    string[],
  ][]) {
    for (const k of words) {
      if (t.includes(k) && k.length > score) {
        best = id;
        score = k.length;
      }
    }
  }
  return best;
}
