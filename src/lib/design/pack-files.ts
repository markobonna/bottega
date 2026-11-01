// The project's pack: every file a maker (or the user) can download.
// Client-only: the concept drawing renders through window.B art.
// Shared by the Pack step panel and the send-off dialog's Files step.

import { brief, pack, scad, slug, stl } from "@/lib/design/cad";
import { fabReadme, strBytes, zipStore } from "@/lib/design/fabpack";
import type { ToolEntry } from "@/lib/design/tools";

export interface PackNote {
  who: string;
  part: number | null;
  topic: string | null;
  text: string;
}

export interface PackDraft {
  n: number;
  label: string;
  stage: string;
}

export interface PackFile {
  name: string;
  what: string;
  mime?: string;
  make: () => string | Uint8Array;
}

const PACKS: Record<string, { file: string; label: string; what: string }> = {
  music: {
    file: "song-pack.md",
    label: "Song pack",
    what: "Lyrics, chords and notes — ready to play or share",
  },
  dance: {
    file: "rehearsal-pack.md",
    label: "Rehearsal pack",
    what: "Counts, formations and music notes — ready to rehearse",
  },
  recipe: {
    file: "recipe-card.md",
    label: "Recipe card",
    what: "Ingredients, steps and cost — ready for the kitchen",
  },
};

export function packLabelFor(medium: string): string | null {
  return PACKS[medium]?.label ?? null;
}

export function buildPackFiles(args: {
  name: string;
  medium: string;
  tagline: string;
  workshopName: string;
  stageLabel: string;
  notes: PackNote[];
  drafts: PackDraft[];
  tools: ToolEntry[];
  flow: string;
  kindLabel: string;
}): PackFile[] {
  const {
    name,
    medium,
    tagline,
    workshopName,
    stageLabel,
    notes,
    drafts,
    tools,
    flow,
    kindLabel,
  } = args;
  const B = window.B;
  const s = slug(name);
  const list: PackFile[] = [];
  const briefText = () =>
    brief({
      name,
      workshopName,
      kindLabel,
      stageLabel,
      tagline,
      notes,
      drafts,
      topics: tools,
    });
  const conceptSvg = () =>
    B.art
      .board({ name, medium, stage: "build" }, "render", { thumb: true })
      .svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  if (medium === "hardware") {
    list.push({
      name: `${s}.scad`,
      what: "Parametric CAD model — opens in OpenSCAD (free), exports STL",
      make: () => scad(name),
    });
    list.push({
      name: `${s}-envelope.stl`,
      what: "STL of the outer envelope — for a quick 3D-print size check",
      make: () => stl(name),
    });
  }
  if (["print", "music", "dance"].includes(medium)) {
    list.push({
      name: `${s}.svg`,
      what: medium === "print" ? "Print-ready artwork (SVG)" : "Drawing (SVG)",
      make: conceptSvg,
    });
  }
  list.push({
    name: `${s}-brief.md`,
    what: "Project brief — every decision and note, for whoever builds it",
    make: briefText,
  });
  if (flow === "quote") {
    list.push({
      name: `${s}-fab-pack.zip`,
      what: "RFQ pack — everything a real shop needs, in one zip",
      mime: "application/zip",
      make: () => {
        const inner = [
          {
            name: `${s}-brief.md`,
            what: "Requirements and decisions",
            text: briefText(),
          },
          {
            name: `${s}-concept.svg`,
            what: "Concept drawing (not dimensioned)",
            text: conceptSvg(),
          },
          ...(medium === "hardware"
            ? [
                {
                  name: `${s}.scad`,
                  what: "Parametric CAD — opens in OpenSCAD (free)",
                  text: scad(name),
                },
                {
                  name: `${s}-envelope.stl`,
                  what: "Envelope for size-check only",
                  text: stl(name),
                },
              ]
            : []),
        ];
        return zipStore([
          {
            name: "README.txt",
            data: strBytes(
              fabReadme({ name, workshopName, kindLabel, files: inner }),
            ),
          },
          ...inner.map((f) => ({ name: f.name, data: strBytes(f.text) })),
        ]);
      },
    });
  }
  const pkg = PACKS[medium];
  if (pkg) {
    list.push({
      name: `${s}-${pkg.file}`,
      what: pkg.what,
      make: () =>
        pack({ name, packLabel: pkg.label, notes, topics: tools }),
    });
  }
  return list;
}

export function downloadPackFile(f: PackFile): void {
  const data = f.make();
  if (typeof data === "string") {
    window.B.download(f.name, data, f.mime);
    return;
  }
  const blob = new Blob([data as unknown as BlobPart], {
    type: f.mime ?? "application/octet-stream",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 800);
}
