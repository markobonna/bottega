import { z } from "zod";

import { readJson, requireUser } from "@/lib/api";
import { validateCodegenFiles } from "@/lib/codegen";
import { OpSchema } from "@/lib/spec/ops";
import { saveFilesVersion, saveVersion } from "@/lib/versions";

export const runtime = "nodejs";

const BodySchema = z.object({
  appId: z.string().min(1),
  ops: z.array(OpSchema),
  summary: z.string(),
  baseVersion: z.number().int().min(1),
  source: z.enum(["edit", "suggest"]).optional().default("edit"),
  files: z
    .array(z.object({ path: z.string(), content: z.string() }))
    .optional(),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  const { data: app } = await auth.supabase
    .from("apps")
    .select("id, owner")
    .eq("id", body.appId)
    .maybeSingle();
  if (!app || app.owner !== auth.user.id)
    return Response.json({ error: "No such project." }, { status: 404 });
  // File revisions never trust the client: the set must pass the same
  // four-file check the generator passed.
  if (body.files) {
    const checked = validateCodegenFiles(body.files);
    if (!checked.ok) {
      return Response.json(
        { error: `Bad revision: ${checked.issues.join("; ")}` },
        { status: 422 },
      );
    }
  }
  try {
    const saved = body.files
      ? await saveFilesVersion(
          auth.supabase,
          body.appId,
          body.baseVersion,
          body.files,
          body.summary,
        )
      : await saveVersion(
          auth.supabase,
          body.appId,
          body.baseVersion,
          body.ops,
          { source: body.source, summary: body.summary },
        );
    if ("conflict" in saved) {
      return Response.json({ error: "conflict" }, { status: 409 });
    }
    return Response.json({ version: saved.version });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Couldn't save." },
      { status: 422 },
    );
  }
}
