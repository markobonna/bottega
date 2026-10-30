// Vendored design-prototype scripts (pristine copies from docs/design).
// They attach to window.B as side effects; no bindings are imported.
declare module "@/vendor/bottega/core.js";
declare module "@/vendor/bottega/types.js";
declare module "@/vendor/bottega/art/common.js";
declare module "@/vendor/bottega/art/world.js";

interface BottegaGlobal {
  art: {
    world: (
      state: {
        workshops: {
          id: string;
          name: string;
          type: string;
          slot: number;
          stage: string;
          lastActivity: number | null;
          projects: { id: string; name: string }[];
        }[];
      },
      opts?: { sketchingId?: string },
    ) => {
      svg: string;
      aspect: string;
      tags: { ws: { id: string; name: string }; x: string; y: string }[];
      lot: { x: string; y: string } | null;
    };
  };
  store: { freeSlot: () => number };
}

declare global {
  interface Window {
    B: BottegaGlobal;
  }
}

export {};
