import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { config, json } from "@/lib/meta";
import { SUGGEST_SYSTEM, WireSuggestSchema, wireOpToOp } from "@/lib/prompts";
import { applyOps } from "@/lib/spec/ops";
import { diffSpecs } from "@/lib/spec/diff";
import { parseSpec } from "@/lib/spec/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({ appId: z.string().min(1) });

interface UsageEvent {
  kind: string | null;
  detail: unknown;
}

function summarize(events: UsageEvent[]): string {
  if (events.length === 0) return "No usage yet — suggest from the spec.";
  const kinds = new Map<string, number>();
  const byCollection = new Map<string, Map<string, number>>();
  for (const e of events) {
    if (!e.kind) continue;
    kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1);
    const detail =
      typeof e.detail === "object" && e.detail !== null
        ? (e.detail as Record<string, unknown>)
        : null;
    const collection = detail?.collection;
    if (typeof collection === "string" && collection !== "") {
      let per = byCollection.get(collection);
      if (!per) {
        per = new Map();
        byCollection.set(collection, per);
      }
      per.set(e.kind, (per.get(e.kind) ?? 0) + 1);
    }
  }
  const lines = [...kinds.entries()].map(([kind, n]) => {
    const per = [...byCollection.entries()]
      .filter(([, kinds]) => kinds.has(kind))
      .map(([c, kinds]) => `${c}: ${kinds.get(kind)}`)
      .join(", ");
    return `- ${kind}: ${n}${per === "" ? "" : ` (${per})`}`;
  });
  return `Usage (last ${events.length} events):\n${lines.join("\n")}`;
}

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  const { data: app } = await auth.supabase
    .from("apps")
    .select("spec")
    .eq("id", body.appId)
    .maybeSingle();
  if (!app) return Response.json({ error: "No such app." }, { status: 404 });
  const parsed = parseSpec(app.spec);
  if (!parsed.ok)
    return Response.json({ error: "Bad app spec." }, { status: 404 });
  const { data: events } = await auth.supabase
    .from("events")
    .select("kind, detail")
    .eq("app_id", body.appId)
    .order("created_at", { ascending: false })
    .limit(200);
  try {
    const draft = await json(
      [
        { role: "system", content: SUGGEST_SYSTEM },
        {
          role: "user",
          content:
            `Current spec:\n${JSON.stringify(parsed.spec)}\n\n${summarize((events ?? []) as UsageEvent[])}`,
        },
      ],
      WireSuggestSchema,
      {
        model: config().wonder,
        reasoning: "medium",
        maxTokens: 4000,
        timeoutMs: 55000,
      },
    );
    const suggestions = [];
    for (const s of draft.suggestions.slice(0, 3)) {
      try {
        const ops = s.ops.map((w, i) => wireOpToOp(w, i));
        const applied = applyOps(parsed.spec, ops);
        if (!applied.ok) continue;
        suggestions.push({
          title: s.title,
          why: s.why,
          ops,
          preview: diffSpecs(parsed.spec, applied.spec),
        });
      } catch {
        continue;
      }
    }
    return Response.json({ suggestions });
  } catch (e) {
    return fail(e);
  }
}
