export const ACCENTS = [
  "terracotta",
  "olive",
  "indigo",
  "teal",
  "plum",
  "ochre",
] as const;

export type Accent = (typeof ACCENTS)[number];
