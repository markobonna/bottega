// Toolbar overrides. The design's B.MEDIUMS tools are the default; any
// medium listed here uses our list instead (same [iconId, label] shape).

export type ToolEntry = [id: string, label: string];

export const TOOLS_OVERRIDE: Record<string, ToolEntry[] | undefined> = {
  hardware: [
    ["sketch", "Sketch"],
    ["measure", "Measure"],
    ["parts", "Parts"],
    ["materials", "Materials"],
  ],
  software: [
    ["screen", "Screens"],
    ["data", "Data"],
    ["group", "Users"],
    ["preview", "Preview"],
  ],
  // Same ids as the design list, so old note topics keep working.
  recipe: [
    ["pot", "Ingredients"],
    ["list", "Method"],
    ["coin", "Cost"],
    ["taste", "Taste test"],
  ],
};

/** Effective toolbar: our override when present, else the design's list. */
export function toolsFor(medium: string, designTools: ToolEntry[]): ToolEntry[] {
  return TOOLS_OVERRIDE[medium] ?? designTools;
}

/** Icon for a tool id; most ids are icon names, these few map. */
export function toolIcon(id: string): string {
  if (id === "sketch") return "pencil";
  if (id === "preview") return "play";
  return id;
}

/** "Ordered" was renamed: requests go out, nothing auto-orders. */
export function sentLabelFor(medium: string, designLabel: string): string {
  if (medium === "hardware") return "Requested";
  return designLabel;
}

const STAGE_LABELS: Record<string, [string, string, string, string, string]> = {
  hardware: ["Sketch", "Design", "Pack", "Send RFQ", "Ship"],
  software: ["Sketch", "Prototype", "Build", "Test", "Go live"],
  print: ["Sketch", "Design", "Proof", "Send RFQ", "Collect"],
  music: ["Sketch", "Write", "Record", "Mix", "Release"],
  dance: ["Sketch", "Choreograph", "Preview", "Rehearse", "Perform"],
  recipe: ["Sketch", "Develop", "Cost", "Recipe card", "Cook"],
};

/** Drafts-wall stage names; the quote family uses real-world steps. */
export function stageLabelsFor(
  medium: string,
  sentLabel: string,
  arrivedLabel: string,
): [string, string, string, string, string] {
  return (
    STAGE_LABELS[medium] ?? [
      "Sketch",
      "Shape",
      "Build",
      sentLabelFor(medium, sentLabel),
      arrivedLabel,
    ]
  );
}

/** Display label for a note topic; falls back to the capitalized id. */
export function topicLabel(topics: ToolEntry[], id: string | null): string | null {
  if (!id) return null;
  // Labels for retired tools, so old notes still read right.
  if (id === "globe") return "Launch";
  return topics.find(([tid]) => tid === id)?.[1] ?? id[0].toUpperCase() + id.slice(1);
}
