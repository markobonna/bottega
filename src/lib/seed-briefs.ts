// Fixture data shared by the demo seed and the look-repaint script: one
// plain sentence per hardware seed project, describing the single THING
// its board art draws. Seeds predate the brief column; without these,
// art falls back to illustrating the tagline (which drew process
// strips, charts and sliders next to the object).
export const SEED_HARDWARE_BRIEFS: Record<string, string> = {
  "Espresso machine v2":
    "A stainless espresso machine being rebuilt for a café counter.",
  "Register drawer fix":
    "An old cash register drawer, repaired to slide and ring again.",
  "Restoration Bench": "A scratched, stained wooden workbench, before restoration.",
  "Bike wall rack": "A wall-mounted rack holding a bicycle.",
  "Workbench lamp": "A bright articulated lamp arm for a workbench.",
  "Movable Stool": "A wheeled workshop stool with locking wheels.",
};

// Cole's bench tells before/after on the board: the sketch is the
// damaged bench, and this revise turns the color design into the
// restored one (same bench, damage repaired).
export const RESTORATION_RESTORE_INSTRUCTION =
  "show the same bench fully restored, scratches and stains gone, clean oiled wood";
