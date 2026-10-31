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
    ["test", "Test"],
    ["globe", "Launch"],
  ],
};

/** Effective toolbar: our override when present, else the design's list. */
export function toolsFor(medium: string, designTools: ToolEntry[]): ToolEntry[] {
  return TOOLS_OVERRIDE[medium] ?? designTools;
}

/** Display label for a note topic; falls back to the capitalized id. */
export function topicLabel(topics: ToolEntry[], id: string | null): string | null {
  if (!id) return null;
  return topics.find(([tid]) => tid === id)?.[1] ?? id[0].toUpperCase() + id.slice(1);
}
