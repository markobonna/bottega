import { randomUUID } from "node:crypto";
import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { image } from "@/lib/meta";
import { updateRecord } from "@/lib/records";
import { parseSpec } from "@/lib/spec/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  appId: z.string().min(1),
  blockId: z.string().min(1),
  recordId: z.string().min(1),
  redo: z.boolean().optional(),
});

function fillTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{([^{}]+)\}/g, (match, key: string) => {
    if (!(key in data)) return match;
    return String(data[key] ?? "")
      .replace(/[{}\n\r]/g, "")
      .slice(0, 120);
  });
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
  const draw = parsed.spec.screens
    .flatMap((s) => s.blocks)
    .find((b) => b.type === "draw" && b.id === body.blockId);
  if (!draw || draw.type !== "draw") {
    return Response.json({ error: "No such draw block." }, { status: 404 });
  }
  const { data: record } = await auth.supabase
    .from("records")
    .select("id, data")
    .eq("id", body.recordId)
    .eq("app_id", body.appId)
    .maybeSingle();
  if (!record) return Response.json({ error: "No such record." }, { status: 404 });
  const data = (record.data ?? {}) as Record<string, unknown>;
  const existing = data[draw.imageField];
  if (typeof existing === "string" && existing !== "" && !body.redo) {
    return Response.json({ imagePath: existing });
  }
  try {
    const prompt = `${fillTemplate(draw.promptTemplate, data)}, no text, no logos, no people's faces`;
    const bytes = await image(prompt);
    const path = `${auth.user.id}/${body.appId}/${randomUUID()}.png`;
    const { error: upError } = await auth.supabase.storage
      .from("media")
      .upload(path, new Blob([bytes as BlobPart], { type: "image/png" }), {
        contentType: "image/png",
      });
    if (upError) throw new Error(upError.message);
    await updateRecord(auth.supabase, record.id, { [draw.imageField]: path });
    return Response.json({ imagePath: path });
  } catch (e) {
    return fail(e);
  }
}
