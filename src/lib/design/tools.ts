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
    ["globe", "Launch"],
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
  if (medium === "hardware" || medium === "space") return "Requested";
  return designLabel;
}

/** Display label for a note topic; falls back to the capitalized id. */
export function topicLabel(topics: ToolEntry[], id: string | null): string | null {
  if (!id) return null;
  return topics.find(([tid]) => tid === id)?.[1] ?? id[0].toUpperCase() + id.slice(1);
}
