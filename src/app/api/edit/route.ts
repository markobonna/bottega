import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { json, jsonWithFallback, type MetaMessage } from "@/lib/meta";
import { EDITOR_SYSTEM, WireEditSchema, wireOpToOp, type WireEdit } from "@/lib/prompts";
import { applyOps } from "@/lib/spec/ops";
import { diffSpecs } from "@/lib/spec/diff";
import { parseSpec, type AppSpec } from "@/lib/spec/schema";
import type { Op } from "@/lib/spec/ops";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  appId: z.string().min(1),
  request: z.string().min(3).max(400),
});

function attempt(
  spec: AppSpec,
  wire: WireEdit,
): { ok: true; spec: AppSpec; ops: Op[] } | { ok: false; issues: string[] } {
  try {
    const ops = wire.ops.map((w, i) => wireOpToOp(w, i));
    const applied = applyOps(spec, ops);
    if (!applied.ok) return applied;
    return { ok: true, spec: applied.spec, ops };
  } catch (e) {
    return { ok: false, issues: [e instanceof Error ? e.message : "bad op"] };
  }
}

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  const { data: app } = await auth.supabase
    .from("apps")
    .select("spec, version, private")
    .eq("id", body.appId)
    .maybeSingle();
  if (!app) return Response.json({ error: "No such project." }, { status: 404 });
  const parsed = parseSpec(app.spec);
  if (!parsed.ok)
    return Response.json({ error: "Bad project spec." }, { status: 404 });
  const base = JSON.stringify(parsed.spec);
  // Private apps stay on local/open and never fall back (a local failure must
  // not leak the request to hosted open weights, nor open to itself).
  const priv = app.private ?? false;
  let viaOpen = false;
  async function ask(messages: MetaMessage[]): Promise<WireEdit> {
    if (priv) {
      return json(messages, WireEditSchema, {
        reasoning: "medium",
        maxTokens: 4000,
        private: true,
      });
    }
    const r = await jsonWithFallback(messages, WireEditSchema, {
      reasoning: "medium",
      maxTokens: 4000,
    });
    viaOpen = viaOpen || r.via === "open";
    return r.data;
  }
  try {
    let draft = await ask([
      { role: "system", content: EDITOR_SYSTEM },
      { role: "user", content: `Current spec:\n${base}\n\nRequest: ${body.request}` },
    ]);
    let tried = attempt(parsed.spec, draft);
    if (!tried.ok) {
      draft = await ask(
        [
          { role: "system", content: EDITOR_SYSTEM },
          {
            role: "user",
            content:
              `Current spec:\n${base}\n\nRequest: ${body.request}\n\nPrevious reply:\n${JSON.stringify(draft)}\n\nIssues:\n${tried.issues.join("\n")}\n\nFix only these problems.`,
          },
        ],
      );
      tried = attempt(parsed.spec, draft);
    }
    if (!tried.ok) {
      return Response.json(
        {
          error:
            "Couldn't change the project from that. Try rewording the request.",
          issues: tried.issues,
        },
        { status: 422 },
      );
    }
    return Response.json({
      summary: draft.summary,
      ops: tried.ops,
      baseVersion: app.version,
      preview: diffSpecs(parsed.spec, tried.spec),
      ...(viaOpen ? { answeredBy: "muse-spark-open" } : {}),
    });
  } catch (e) {
    return fail(e);
  }
}
