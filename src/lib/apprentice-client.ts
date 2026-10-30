// Client-safe calls to the apprentice brain (/api/ask) and project builder.
// Shared by the header Ask bar and the bottom talk bar. Errors are thrown
// as UI-ready messages.

import type { DesignMedium } from "./design/project-art";

export interface Turn {
  role: "user" | "assistant";
  text: string;
}

// Idea chips anywhere say things into the talk bar.
export function say(text: string): void {
  window.dispatchEvent(new CustomEvent("bottega:say", { detail: text }));
}

export interface AskBuild {
  workshopId: string;
  description: string;
  kind: DesignMedium;
}

export interface AskReply {
  say?: string;
  navigate?: string;
  build?: AskBuild;
  error?: string;
}

export function contextFromPath(pathname: string): {
  appId?: string;
  workshopId?: string;
} {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "projects" && parts[1]) return { appId: parts[1] };
  if (parts[0] === "workshops" && parts[1]) return { workshopId: parts[1] };
  if (parts[0] === "new") {
    const q = new URLSearchParams(window.location.search).get("workshop");
    if (q) return { workshopId: q };
  }
  return {};
}

export async function askApprentice(
  message: string,
  history: Turn[],
  context: { appId?: string; workshopId?: string },
): Promise<AskReply> {
  let res: Response;
  try {
    res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: history.slice(-6), context }),
    });
  } catch {
    throw new Error("The model didn't answer. Try again.");
  }
  if (res.status === 503) {
    throw new Error("Ask is off right now (no model key).");
  }
  const data = (await res.json()) as AskReply;
  if (!res.ok) {
    throw new Error(data.error ?? "The model didn't answer. Try again.");
  }
  return data;
}

export async function buildFromAsk(build: AskBuild): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(build),
    });
  } catch {
    throw new Error("Couldn't build that. Try again.");
  }
  const data = (await res.json()) as { appId?: string; error?: string };
  if (!res.ok || !data.appId) {
    throw new Error(data.error ?? "Couldn't build that. Try again.");
  }
  return data.appId;
}

export async function transcribeBlob(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "audio.wav");
  let res: Response;
  try {
    res = await fetch("/api/hear", { method: "POST", body: form });
  } catch {
    throw new Error("Couldn't hear that. Try again.");
  }
  if (!res.ok) {
    throw new Error(
      res.status === 503
        ? "Voice is off right now (no model key). Type it instead."
        : "Couldn't hear that. Try again.",
    );
  }
  return ((await res.json()) as { transcript: string }).transcript;
}
