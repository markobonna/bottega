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
      "space",
    ])
    .optional(),
});

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
    let viaOpen = false;
    const first = await jsonWithFallback(
      [
        { role: "system", content: BUILDER_SYSTEM },
        { role: "user", content: body.description },
      ],
      WireSpecSchema,
      { reasoning: "medium", maxTokens: 4000 },
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
        { reasoning: "medium", maxTokens: 4000 },
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
    const appId = await createApp(auth.supabase, parsed.spec, {
      source: "build",
      summary: "Built from your description",
      workshopId: body.workshopId,
      kind:
        body.kind ?? detectMedium(`${parsed.spec.name} ${body.description}`),
    });
    return Response.json({
      appId,
      spec: parsed.spec,
      ...(viaOpen ? { answeredBy: "muse-spark-open" } : {}),
    });
  } catch (e) {
    return fail(e);
  }
}
