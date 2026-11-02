import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { renderPortraitFromSketch } from "@/lib/project-look";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  appId: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  const { data: app } = await auth.supabase
    .from("apps")
    .select("id, kind, owner, blueprint_path")
    .eq("id", body.appId)
    .maybeSingle();
  if (!app || app.owner !== auth.user.id)
    return Response.json({ error: "No such project." }, { status: 404 });
  if (!app.blueprint_path)
    return Response.json(
      { error: "Sketch it first — the portrait grows out of the sketch." },
      { status: 400 },
    );

  try {
    const { data, error: dlError } = await auth.supabase.storage
      .from("media")
      .download(app.blueprint_path);
    if (dlError || !data) throw new Error(dlError?.message || "No sketch.");
    const sketchBytes = new Uint8Array(await data.arrayBuffer());
    const lookPath = await renderPortraitFromSketch(
      auth.supabase,
      auth.user.id,
      { id: app.id, kind: app.kind ?? "software" },
      sketchBytes,
    );
    const { error: upError } = await auth.supabase
      .from("apps")
      .update({ look_path: lookPath })
      .eq("id", app.id);
    if (upError) throw new Error(upError.message);
    return Response.json({ lookPath });
  } catch (e) {
    return fail(e);
  }
}
