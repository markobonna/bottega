import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { detectMedium } from "@/lib/design/project-art";
import { jsonWithFallback } from "@/lib/meta";
import { BUILDER_SYSTEM, WireSpecSchema } from "@/lib/prompts";
import { parseSpec } from "@/lib/spec/schema";
import { createApp } from "@/lib/versions";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  description: z.string().min(10).max(1500),
  workshopId: z.string().min(1),
  kind: z
    .enum([
      "hardware",
      "software",
      "music",
      "dance",
      "print",
      "recipe",
    ])
    .optional(),
});

/** Truncate at a word boundary with an ellipsis — never mid-word. */
function shortTitle(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1).replace(/\s+\S*$/, "");
  return `${cut || t.slice(0, max - 1)}…`;
}

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  const { data: workshop } = await auth.supabase
    .from("workshops")
    .select("id, owner")
    .eq("id", body.workshopId)
    .maybeSingle();
  if (!workshop || workshop.owner !== auth.user.id)
    return Response.json({ error: "No such workshop." }, { status: 404 });
  try {
    // Software revision 4: Spark builds the app directly (designed files),
    // so no block-catalog spec is needed up front. The row carries a stub
    // spec plus the brief; the design call fills in the real app once the
    // shape is picked. Every other kind keeps the spec pipeline.
    const kind =
      body.kind ?? detectMedium(`${body.description.slice(0, 80)}`);
    if (body.kind === "software" || kind === "software") {
      const stub = {
        version: 1,
        name: shortTitle(body.description, 40) || "New app",
        tagline: shortTitle(body.description, 80) || "Built with Bottega",
        look: { accent: "terracotta", icon: "📱" },
        collections: [],
        screens: [],
      } as const;
      const appId = await createApp(auth.supabase, stub, {
        source: "build",
        summary: "Built from your description",
        workshopId: body.workshopId,
        kind: "software",
      });
      const { error: briefError } = await auth.supabase
        .from("apps")
        .update({ brief: body.description.slice(0, 1500) })
        .eq("id", appId);
      if (briefError) {
        return Response.json(
          { error: `Couldn't save the brief: ${briefError.message}` },
          { status: 500 },
        );
      }
      return Response.json({ appId, spec: stub });
    }
    let viaOpen = false;
    const first = await jsonWithFallback(
      [
        { role: "system", content: BUILDER_SYSTEM },
        { role: "user", content: body.description },
      ],
      WireSpecSchema,
      { reasoning: "minimal", maxTokens: 4000, timeoutMs: 60000 },
    );
    viaOpen = viaOpen || first.via === "open";
    let draft = first.data;
    let parsed = parseSpec(draft);
    if (!parsed.ok) {
      const second = await jsonWithFallback(
        [
          { role: "system", content: BUILDER_SYSTEM },
          {
            role: "user",
            content: `${body.description}\n\nPrevious spec:\n${JSON.stringify(draft)}\n\nIssues:\n${parsed.issues.join("\n")}\n\nFix only these problems.`,
          },
        ],
        WireSpecSchema,
        { reasoning: "minimal", maxTokens: 4000, timeoutMs: 60000 },
      );
      viaOpen = viaOpen || second.via === "open";
      draft = second.data;
      parsed = parseSpec(draft);
    }
    if (!parsed.ok) {
      return Response.json(
        {
          error:
            "Couldn't design a valid app from that. Try adding a sentence about what you track.",
          issues: parsed.issues,
        },
        { status: 422 },
      );
    }
    // No invented identity: the project carries the person's own words,
    // trimmed at word boundaries like the software stub. Spark designs
    // the structure (collections/screens/blocks) — the thing only a
    // designer can do — but never the name on the door.
    parsed.spec.name = shortTitle(body.description, 40) || "New project";
    parsed.spec.tagline =
      shortTitle(body.description, 80) || "Built with Bottega";
    const appId = await createApp(auth.supabase, parsed.spec, {
      source: "build",
      summary: "Built from your description",
      workshopId: body.workshopId,
      kind:
        body.kind ?? detectMedium(`${parsed.spec.name} ${body.description}`),
    });
    // The raw sentence, so art prompts use the user's words, not the
    // Spark-written tagline (same save as the software path above).
    const { error: briefError } = await auth.supabase
      .from("apps")
      .update({ brief: body.description.slice(0, 1500) })
      .eq("id", appId);
    if (briefError) {
      return Response.json(
        { error: `Couldn't save the brief: ${briefError.message}` },
        { status: 500 },
      );
    }
    return Response.json({
      appId,
      spec: parsed.spec,
      ...(viaOpen ? { answeredBy: "muse-spark-open" } : {}),
    });
  } catch (e) {
    return fail(e);
  }
}
