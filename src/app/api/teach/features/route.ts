import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { parseSpec } from "@/lib/spec/schema";
import { scorePhoto } from "@/lib/teach";

export const runtime = "nodejs";
export const maxDuration = 30;

const BodySchema = z.object({
  appId: z.string().min(1),
  blockId: z.string().min(1),
  photoPath: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  if (!body.photoPath.startsWith(`${auth.user.id}/${body.appId}/`)) {
    return Response.json(
      { error: "That photo doesn't belong to this project." },
      { status: 403 },
    );
  }
  const { data: app } = await auth.supabase
    .from("apps")
    .select("spec, owner")
    .eq("id", body.appId)
    .maybeSingle();
  if (!app || app.owner !== auth.user.id)
    return Response.json({ error: "No such project." }, { status: 404 });
  const parsed = parseSpec(app.spec);
  if (!parsed.ok)
    return Response.json({ error: "Bad project spec." }, { status: 404 });
  const teach = parsed.spec.screens
    .flatMap((s) => s.blocks)
    .find((b) => b.type === "teach" && b.id === body.blockId);
  if (!teach || teach.type !== "teach") {
    return Response.json({ error: "No such teach block." }, { status: 404 });
  }
  try {
    const result = await scorePhoto(auth.supabase, body.photoPath, teach.dims);
    return Response.json(result);
  } catch (e) {
    return fail(e);
  }
}
