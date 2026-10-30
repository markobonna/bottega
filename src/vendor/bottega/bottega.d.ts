// Vendored design-prototype scripts (pristine copies from docs/design,
// except art/world.js and art/room.js — see their BOTTEGA DIVERGENCE notes).
// They attach to window.B as side effects; no bindings are imported.
declare module "@/vendor/bottega/core.js";
declare module "@/vendor/bottega/types.js";
declare module "@/vendor/bottega/art/common.js";
declare module "@/vendor/bottega/art/world.js";
declare module "@/vendor/bottega/art/room.js";
declare module "@/vendor/bottega/art/board.js";

interface BottegaRoomProject {
  id?: string;
  name: string;
  medium: string;
  stage: string;
  drawing?: string;
  specs?: {
    width: number;
    depth?: number;
    height: number;
    unit: string;
    qty?: number;
  };
  lines?: string[];
  ingredients?: string[];
}

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
    room: (
      ws: {
        id: string;
        name: string;
        type: string;
        projects: BottegaRoomProject[];
      },
      opts?: { newId?: string },
    ) => {
      svg: string;
      tags: { p: BottegaRoomProject; x: string; y: string }[];
      spots: {
        p: BottegaRoomProject;
        x: string;
        y: string;
        w: string;
        h: string;
      }[];
      newSpot: { x: string; y: string } | null;
      door: { x: string; y: string };
      overflow: number;
    };
    board: (
      p: BottegaRoomProject,
      mode: string,
      opts?: { thumb?: boolean; stage?: string },
    ) => {
      svg: string;
      parts: { n: number; x: number; y: number; label: string }[];
      caption: string;
    };
    modeForStage: (stage: string) => string;
    drawingFor: (p: BottegaRoomProject) => string;
  };
  store: { freeSlot: () => number };
  WORKSHOP_TYPES: Record<
    string,
    {
      label: string;
      article: string;
      defaultMedium: string;
      mediums: string[];
      examples: string[];
    }
  >;
  MEDIUMS: Record<
    string,
    {
      label: string;
      tools: [string, string][];
      flow: string;
      sentLabel: string;
      arrivedLabel: string;
      thing: string;
    }
  >;
  STAGES: string[];
  stageLabel: (p: { medium: string; stage: string }) => string;
  fillLevel: (stage: string) => string;
  icon: (name: string, size?: number, sw?: number) => string;
  sigil: (s?: number) => string;
  cap: (s: string) => string;
  esc: (s: unknown) => string;
  hash: (s: string) => number;
  pct: (v: number, total: number) => string;
  timeAgo: (ts: number | null) => string;
}

declare global {
  interface Window {
    B: BottegaGlobal;
  }
}

export {};
